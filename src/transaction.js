"use strict";

const bech32 = require('bech32');
const pb = require('./proto/transaction_pb');
const BigNumber = require('bignumber.js');

class Transaction {
  constructor(nonce = 0, from = '', to = '', value = '', gasPrice = '', gasLimit = '', data = '', chainID='', version = 0) {
    Transaction.validateAddresses([from, to]);
    this.nonce = nonce;
    this.sender = from;
    this.receiver = to;
    this.value = value;
    this.gasPrice = gasPrice;
    this.gasLimit = gasLimit;
    this.data = data;
    this.chainID = chainID;
    this.version = version

    // Set an empty signature for start
    this.signature = '';
  }

  /**
   * Returns the Buffer representation of the current transaction in order for it to be signed
   * @returns {Buffer}
   */
  prepareForSigning() {
    let mainTx = {
      nonce: this.nonce,
      value: this.value,
      receiver: this.receiver,
      sender: this.sender,
    };

    // The following properties which are optional are added only if they are set up
    if ( this.gasPrice ) {
      mainTx.gasPrice = this.gasPrice;
    }
    if ( this.gasLimit ) {
      mainTx.gasLimit = this.gasLimit;
    }
    if ( this.data ) {
      mainTx.data = Buffer.from(this.data).toString('base64');
    }
    if ( this.chainID ) {
      mainTx.chainID = this.chainID;
    }
    if ( this.version ) {
      mainTx.version = this.version
    }

    let mainTxJSON = JSON.stringify(mainTx);
    return Buffer.from(mainTxJSON);
  }

  /**
   * Returns the protobuf representation of the current transaction in order for it to be signed
   * @return {!Uint8Array}
   */
  prepareForSigningProto() {
    let tpb = new pb.Transaction;

    tpb.setNonce(this.nonce);
    tpb.setValue(Transaction.toErdBigInt(this.value));
    tpb.setRcvaddr(this.receiver);
    tpb.setSndaddr(this.sender);

    // The following properties which are optional are added only if they are set up
    if (this.gasPrice) {
      tpb.setGasprice(this.gasPrice);
    }
    if (this.gasLimit) {
      tpb.setGaslimit(this.gasLimit);
    }
    if (this.data) {
      tpb.setData(this.data);
    }

    return tpb.serializeBinary();
  }

  prepareForNode() {
    return {
      nonce: this.nonce,
      value: this.value,
      receiver: this.receiver,
      sender: this.sender,
      gasPrice: this.gasPrice,
      gasLimit: this.gasLimit,
      data: Buffer.from(this.data).toString('base64'),
      chainID: this.chainID,
      version: this.version,
      signature: this.signature,
    }
  }

  static validateAddresses(addresses) {
    for ( let address of addresses ) {
      try {
        bech32.decode(address);
      } catch (e) {
        throw new Error("invalid bech32 address");
      }
    }
  }

  /**
   * Converts the provided value to elrond's protobuf big int representation
   * @returns {Buffer}
   */
  static toErdBigInt(value) {
    // Format  <sign><absolute value>
    // Where <sign> one byte (0 for positive, 1 for negative)
    //       <absolute value> any number of bytes representing
    //                        the absolute value (bigendian)
    const zeroBuf = Buffer.from('0000', 'hex');
    let bn = new BigNumber(value);

    if (!bn.isInteger()) {
      throw "Provided value is not an integer";
    }

    if (bn.eq(0)) {
      return zeroBuf;
    }

    let sign = '00';
    if (bn.lt(0)) {
      sign = '01';
      bn = bn.abs();
    }

    let abs = bn.toString(16);
    if (abs.length % 2) {
      abs = "0" + abs;
    }
    return Buffer.from( sign + abs, 'hex');
  }
}

module.exports = Transaction;
