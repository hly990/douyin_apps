module.exports = [
  {
    method: "GET",
    path: "/ping",
    handler: "api::ping.ping.index",
    config: {
      auth: false
    }
  },
  {
    method: "GET",
    path: "/token-check",
    handler: "api::ping.ping.checkToken",
    config: {
      auth: false
    }
  },
  {
    method: "POST",
    path: "/simple-login",
    handler: "api::ping.ping.simpleLogin",
    config: {
      auth: false
    }
  }
]; 