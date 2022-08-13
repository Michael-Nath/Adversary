# Adversary - TypeScript Implementation of Full Node on Marabu Blockchain

Built by <a href="https://www.linkedin.com/in/michael-nath/">`Michael Nath`</a> and <a href="https://www.linkedin.com/in/kenan-hasanaliyev/">`Kenan Hasanaliyev`</a> @ _Stanford University_

## Motivation

_Adversary_ was created as a quarter-long project for `EE 374: Blockchain Foundations`, a graduate-level elective offered only at _Stanford University_. Our full node strictly follows the protocol of <a href="https://web.stanford.edu/class/ee374/protocol/">Marabu</a>, a blockchain adapted by instructors `Dionysis Zindros` and `David Tse` for its pedagogical design. _Adversary_ is backed by rigorous blockchain theory proved in class, all coded in TypeScript under a simple functional paradigm. We have decided to publish the source code of _Adversary_ as our contribution to the blockchain development community, and to publish an integration of theory and engineering that we are proud of.

## Technical Background

### Conceptual Overview

    - Honest Majority + Non-Eclipsing Assumption
    - Gossiping
    - Proof-Of-Work
    - Mempool + UTXO
    - Chain Reorganization
    - Double Spending + Law of Conservation

The Marabu blockchain is a proof-of-work based UTXO blockchain.

### Peer Connections

Connections are made through a gossip protocol that involves exchanging peers upon each TCP handshake. It is assumed that every pair of honestly operating nodes are at least indirectly linked through a route consisting of only honest nodes (aka, the non-eclipsing assumption). This ensures that every message an honest node sends will make it to every other honest node. As a result, all honest nodes will be mining on a longest chain.

### Message handling

All nodes on the blockchain actively listen for transactions and blocks posted by their connected peers. Upon receiving a transaction, it's checked for proper format and added to the global mempool (if the transaction is valid with respect to it). Upon receiving a block, the transactions within are requested and made sure to be of valid format and valid with respect to the UTXO set of the previous block it builds upon. If the block is valid in both manners, it is added to the block tree and the longest chain is re-evaluated (with a chain reorganization performed if necessary).

### Message validation

A UTXO set is maintained for each block and the global mempool. It is important that incoming transactions are verified to have their money sourced from valid UTXO elements to prevent double-spending and sending money from thin air. In addition, transactions are checked to make sure no more money is being sent than inputted (aka, Law of Conservation).

### Hashing and Proof-of-Work

To minimize network traffic, the whole of a transaction/block is not sent out until its hash has sent to peers of the sender and the receiver informs the sender it doesn't have an object with that hash. In addition, to prevent spam attacks on the network, blocks are initially checked to satisfy the proof-of-work equation before anything else is done. When a block satisfies the proof-of-work equation, it ensures that a lot of compute effort was put into it, limiting the amount of valid blocks that can be sent out in a period of time.

## Implementation

### Algorithms + Libraries

    Cryptographic Primatives
      - SHA-256
      - ED25519

    Server
      - Net { Socket }
      - stream { EventEmitter }
      - nanoid

    DB
      - level
      - subleveldown
      - canonicalize

    Misc
      - fs

Our full node is implemented in `TypeScript` and run using `Node.js` with a functional programming approach. Connections to and from peers were handled using `Net`, where `nanoid` is used to tag each instance of the full node client interested in connecting to a given peer. Node is bootstrapped with a few known honest parties through local `peers.txt` read using `fs`. All messages in the network are sent as JSONs in adherence to the protocol, where `canonicalize` is used to canocalize the message to ensure consistent hashing (through `SHA-256`) across differing nodes. All transactions, blocks, and currently connected peers are stored using `LevelDB` and `subleveldown`. Signatures within transacitons are verified with `ed`. Event emitters are used to let node know that certain requested blocks / transactions have been entered into the database, allowing for recursive chain validation to progress.
