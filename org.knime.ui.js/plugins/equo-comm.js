// TODO this file will be removed with NXT-987
/* istanbul ignore file */
/* eslint-disable */
let EquoCommService;
(() => {
    'use strict';
    var e = {
        d: (o, n) => {
            for (let t in n) {
                e.o(n, t) && !e.o(o, t) && Object.defineProperty(o, t, { enumerable: !0, get: n[t] });
            }
        },
        o: (e, o) => Object.prototype.hasOwnProperty.call(e, o)
    };
    let o = {};
    (() => {
        let n, t;
        e.d(o, { EquoCommService: () => s }),
        (function (e) {
            const o = window;
            function n(e) {
                o[e.id] || (o[e.id] = e.service);
            }
            e.get = function (e, t) {
                const r = o[e];
                if (!r && t != null) {
                    const o = t();
                    if (!o) {
                        throw new Error(`${e} couldn't be created`);
                    }
                    return n(o), o.service;
                }
                if (r) {
                    return r;
                }
                throw new Error(`${e} has not been installed`);
            },
            e.install = n;
        })(n || (n = {})),
        (function (e) {
            for (var o = [], n = 0; n < 256; n++) {
                o[n] = (n < 16 ? '0' : '') + n.toString(16);
            }
            e.getUuid = function () {
                let e = (4294967296 * Math.random()) >>> 0;
                let n = (4294967296 * Math.random()) >>> 0;
                let t = (4294967296 * Math.random()) >>> 0;
                let r = (4294967296 * Math.random()) >>> 0;
                return `${o[255 & e] + o[(e >> 8) & 255] + o[(e >> 16) & 255] + o[(e >> 24) & 255]}-${o[255 & n]}${
                    o[(n >> 8) & 255]
                }-${o[((n >> 16) & 15) | 64]}${o[(n >> 24) & 255]}-${o[(63 & t) | 128]}${o[(t >> 8) & 255]}-${
                    o[(t >> 16) & 255]
                }${o[(t >> 24) & 255]}${o[255 & r]}${o[(r >> 8) & 255]}${o[(r >> 16) & 255]}${o[(r >> 24) & 255]}`;
            };
        })(t || (t = {}));
        class r {
            constructor(e) {
                this.userEventCallbacks = new Map(),
                this.ws = this.getWebSocketIfExists(e),
                void 0 === this.ws &&
                        (window.equoReceiveMessage = (e) => {
                            this.receiveMessage(e);
                        });
            }

            getWebSocketIfExists(e) {
                if (void 0 !== e) {
                    if (void 0 !== this.ws && this.ws.readyState !== WebSocket.CLOSED) {
                        return this.ws;
                    }
                    let o = new WebSocket(`ws://127.0.0.1:${e}`);
                    return (
                        o.onopen = (e) => {},
                        o.onclose = () => {},
                        o.onmessage = (e) => {
                            this.receiveMessage(e.data);
                        },
                        o
                    );
                }
            }

            receiveMessage(e) {
                let o;
                let n = this.processMessage(e);
                if (n) {
                    let t = n.actionId;
                    if (this.userEventCallbacks.has(t)) {
                        let r = this.userEventCallbacks.get(n.actionId);
                        if (
                            ((o = r == null ? void 0 : r.args) === null || void 0 === o ? void 0 : o.once) &&
                                this.userEventCallbacks.delete(t),
                            void 0 === n.success || n.success
                        ) {
                            let i = r == null ? void 0 : r.onSuccess(n.payload);
                            void 0 !== n.callbackId && this.sendToJava({ actionId: n.callbackId, payload: i });
                        } else {
                            (r == null ? void 0 : r.onError) && void 0 !== n.error && r.onError(n.error);
                        }
                    }
                }
            }

            processMessage(e) {
                if (void 0 === e) {
                    return null;
                }
                try {
                    return JSON.parse(e);
                } catch (e) {}
                return null;
            }

            sendToJava(e, o) {
                let n, t;
                let r = JSON.stringify({
                    actionId: e.actionId,
                    payload: e.payload,
                    callbackId: o == null ? void 0 : o.id
                });
                void 0 !== window.equoSend
                    ? window.equoSend({
                        request: r,
                        onSuccess: (e) => {
                            let n;
                            try {
                                n = JSON.parse(e);
                            } catch (o) {
                                n = e;
                            }
                            o == null || o.onSuccess(n);
                        },
                        onError: (n = o == null ? void 0 : o.onError) !== null && void 0 !== n ? n : () => {},
                        persistent: !((t = o == null ? void 0 : o.args) === null || void 0 === t ? void 0 : t.once)
                    })
                    : void 0 !== this.ws &&
                      this.waitForCommConnection(this, () => {
                          let e;
                          (e = this.ws) === null || void 0 === e || e.send(r);
                      });
            }

            waitForCommConnection(e, o) {
                setTimeout(() => {
                    void 0 !== this.ws &&
                        (this.ws.readyState === WebSocket.OPEN ? o != null && o() : e.waitForCommConnection(e, o));
                }, 5);
            }

            send(e, o) {
                return (
                    n = this,
                    r = void 0,
                    s = function *() {
                        return yield new Promise((n, r) => {
                            let i = { actionId: e, payload: o };
                            let s = { onSuccess: n, onError: r, args: { once: !0 } };
                            void 0 !== this.ws && (s.id = t.getUuid(), this.on(s.id, n, r, s.args)),
                            this.sendToJava(i, s);
                        });
                    },
                    new ((i = void 0) || (i = Promise))((e, o) => {
                        function t(e) {
                            try {
                                c(s.next(e));
                            } catch (e) {
                                o(e);
                            }
                        }
                        function a(e) {
                            try {
                                c(s.throw(e));
                            } catch (e) {
                                o(e);
                            }
                        }
                        function c(o) {
                            let n;
                            o.done
                                ? e(o.value)
                                : (n = o.value,
                                n instanceof i
                                    ? n
                                    : new i((e) => {
                                        e(n);
                                    })).then(t, a);
                        }
                        c((s = s.apply(n, r || [])).next());
                    })
                );
                let n, r, i, s;
            }

            on(e, o, n, t) {
                let r = { onSuccess: o, onError: n, args: t };
                this.userEventCallbacks.set(e, r);
            }
        }
        const i = 'equo-comm';
        const s = n.get(i, () => {
            let e;
            if (void 0 === window.equoSend) {
                const o = new URLSearchParams(window.location.search).get('equocommport');
                e = o === null ? void 0 : Number(o);
            }
            return { id: i, service: new r(e) };
        });
    })(),
    EquoCommService = o.EquoCommService;
})();

export default () => {
    // eslint-disable-next-line no-console
    EquoCommService.on('org.knime.ui.java.jsonrpcNotification', window.jsonrpcNotification, e => console.error(e));
    if (!window.jsonrpc) {
        window.jsonrpc = request => EquoCommService.send('org.knime.ui.java.jsonrpc', request);
    }
};
