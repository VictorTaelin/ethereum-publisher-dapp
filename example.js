const Publisher = require(".");

(async () => {
  // Creates a Publisher instance
  const publisher = await Publisher({
    ipfsUrl: "https://ipfs.infura.io:5001",
    ethUrl: "https://rinkeby.infura.io/sE0I5J1gO2jugs9LndHR"
  });

  // Publishes the keccak256 and the ipfs cid of the JSON
  // Note: the IPFS cid is converted to bytes32. To convert
  // it back, use publisher.bytes32ToCid("0x...").
  const txid = await publisher.publish({
    privateKey: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    json: {x: 1, y: 2, z: 3}
  });

  console.log("Transaction id:");
  console.log(txid);

})();
