// This is messy, because it was done in the middle of an ongoing work.
// For example, I shouldn't be using eth-lib, as it is being ported to
// Moon. But I had to, because it has a few things that I don't have on
// Moon, and vice-versa. Ideally I shouldn't be doing apps before finishing
// those things. But avsa needed it so that's what I can do for now.

module.exports = async ({ipfsUrl, ethUrl}) => {

  // IPFS
  const ipfs = require("nano-ipfs-store").at(ipfsUrl);
  const bs58 = require("bs58");
  const cidToBytes32 = cid => "0x" + bs58.decode(cid).toString("hex").slice(8);
  const bytes32ToCid = bytes32 => bs58.encode(Buffer.from("82c1fded"  +bytes32.slice(2), "hex"));

  // Used for RPC, signatures and UTF-8 encodings
  const Eth = require("eth-lib");
  const rpc = Eth.rpc(ethUrl);

  // Used for ABI encoding, bytes concatenation and keccak256
  const Moon = require("moon-lang")("https://ipfs.infura.io:5001");
  const abi = Moon.parse(await Moon.imports("zb2rheJKYA9tUu9qTHFTqk3vwJaXTFyK6hJxVXzNdayG9Ctfc"));
  const bytesConcat = Moon.parse(await Moon.imports("zb2rhd8xzKmJPH4H4D8SABF547bcJy2P5ze7hmPEHJz2Pnp7N"));
  const keccak256 = Moon.parse(await Moon.imports("zb2rhkcDyioJbNcAMUAD4rBxi1pp5g5qFzAkGvQiKPu6MJcVu"));

  // Not implemented on either, so I had to hack it here
  const methodCallData = (method, params) => {
    const methodName = method.slice(0, method.indexOf("("));
    const methodType = method.slice(method.indexOf("("));
    const methodSig = keccak256(Eth.bytes.fromString(method)).slice(0,10);
    const paramsData = abi("encode")(methodType)(params);
    const callData = bytesConcat(methodSig)(paramsData);
    return callData;
  };

  // OK, now we're ready to build this script
  const publish = async ({privateKey, json}) => {
    const string = JSON.stringify(json);

    const ipfsCid = await ipfs.add(string);
    console.log("## Published on IPFS. Cid:", ipfsCid, "\n");

    const store = [
      ["keccak256", keccak256(Eth.bytes.fromString(string))],
      ["ipfsCid", cidToBytes32(ipfsCid)]
    ];

    console.log("## Publishing:");
    store.forEach(([key, val]) => {
      console.log("- " + key + " (" + Eth.bytes.padRight(32, Eth.bytes.fromString(key)) + "): " + val);
    });
    
    const account = Eth.account.fromPrivate(privateKey);
    const nonce = await rpc("eth_getTransactionCount", [account.address, "latest"]);

    const tx = {
      from: account.address,
      to: "0x874968a344dfC4F52Dde9F6f47b97F71529a95A1",
      chainId: "0x4",
      value: "0x0",
      gasPrice: Eth.nat.fromString("20000000000"), // 20gwei
      gas: Eth.nat.fromString("200000"), // 200k gas
      data: methodCallData("publish(bytes32[],bytes32[])", [store.map(([k,v])=>Eth.bytes.fromString(k)), store.map(([k,v])=>v)]),
      nonce: nonce
    };
    console.log("Ethereum transaction (json):");
    console.log(JSON.stringify(tx, null, 2),"\n");

    const stx = Eth.transaction.sign(tx, account);
    console.log("Ethereum transaction (raw, signed):");
    console.log(stx);

    return rpc("eth_sendRawTransaction", [stx]);
  };

  return {
    publish: publish,
    bytes32ToCid, 
    cidToBytes32
  }

};
