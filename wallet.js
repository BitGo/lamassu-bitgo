var _ = require('lodash');
var bitgolib = require('bitgo');

exports.NAME = 'BitGo';
exports.SUPPORTED_MODULES = ['wallet'];

var pluginConfig = {
  // token: <your BitGo access token>
  // walletId: <your wallet id>,
  // walletPassphrase: <your wallet passphrase>
};

var bitgo;

exports.config = function config(localConfig) {
  if (localConfig) {
    _.merge(pluginConfig, localConfig);
  }
  if (pluginConfig.token && pluginConfig.wallet && pluginConfig.walletPassphrase) {
    bitgo = new bitgolib.BitGo({ env: 'prod' });
    bitgo._token = pluginConfig.token;
  } else {
    throw new Error('BitGo config requires token and walletId');
  }
};

exports.sendBitcoins = function sendBitcoins(address, satoshis, fee, callback) {
  var wallet = bitgo.newWalletObject({ id: pluginConfig.walletId });

  var params = {
    address: address,
    amount: satoshis,
    fee: fee,  // TODO: support fee in sendCoins
    walletPassphrase: pluginConfig.walletPassphrase
  };

  return wallet.sendCoins(params)
  .then(function(result) {
    return result.hash;
  })
  .catch(function(err) {
    if (err.message === 'Insufficient funds') {
      err.name = 'InsufficientFunds';
    }
    throw err;
  })
  .nodeify(callback);
};

exports.balance = function balance(callback) {
  return bitgo.wallets().get({ id: pluginConfig.walletId })
  .then(function(wallet) {
    return {
      BTC: wallet.confirmedBalance()
    };
  })
  .nodeify(callback);
};

exports.newAddress = function newAddress(info, callback) {
  var walletId = pluginConfig.walletId;
  var wallet = bitgo.newWalletObject({ id: walletId });
  var address;

  return wallet.createAddress()
  .then(function(result) {
    address = result.address;

    // If a label was provided, set the label
    if (info.label) {
      // TODO: replace with SDK label API
      var url = bitgo.url('/labels/' + walletId + '/' + address);
      return self.bitgo.put(url)
      .send({ label: info.label.toString() })
      .result();
    }
  })
  .then(function() {
    return address;
  })
  .nodeify(callback);
};

