"use strict";

import {Map, List} from "immutable";
import {take, put, chan, go} from "js-csp";



/*
 * Function which init request for states of all
 * requested components and when it's ready put it
 * into resulting channel (resultCh)
 */

function collect(state, routes, resultCh) {
  var channel = chan(),
      total = routes(state, channel);

  if (total === null) return false;

  go(function *() {
    var data = List();

    // waiting for all components states
    while(data.size < total) {
      data = data.push(yield take(channel));
    }
    yield put(resultCh, data);
  });

  return true;
}

/*
 * Function which generate state on client or on server.
 */
function build () {
  var state = Map([
    ["params", Map()], // synthetic params from URL
    ["url", "/"],
    ["get", Map()],
    ["post", Map()],
    ["hash", ""], // client-side only
    ["protocol", "http:"],
    ["hostname", "localhost"],
    ["method", "GET"],
    ["cookie", Map()]
  ]);
  return {
    client: (location) => {
      return state.merge(Map([
        ["cookie", Map(document.cookie.split("; ").map(p => p.split("=").map(decodeURIComponent)))],
        ["url", location.pathname],
        ["protocol", location.protocol],
        ["hostname", location.hostname],
        ["hash", location.hash]
      ]));
    },
    server: (request) => {
      var cookie = request.headers.cookie || "";
      return state.merge(Map([
        ["url", request.url],
        ["method", request.method],
        ["cookie", Map(cookie.split("; ").map(p => p.split("=").map(decodeURIComponent)))],
      ]));
    }
  }
}

/*
 * Parse params from URL
 */
function params(state, route) {
  var [nameXP, paramXP] = [route.get("nameXP"), route.get("paramXP")];

  var names = nameXP.exec(route.get("url")),
      values = paramXP.exec(state.get("url"));

  if (names === null || values === null) return state;

  // zip names with values and put as a Map
  return state.set("params", Map(
    names.slice(1).map((name, id) => {
      return [name, values[id + 1]];
    })));
}

module.exports = {
  collect: collect,
  build: build(),
  params:params
}
