// The MIT License (MIT)
// 
// media-player (https://github.com/mkloubert/media-player)
// Copyright (c) Marcel Joachim Kloubert <marcel.kloubert@gmx.net>
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

import * as Express from 'express';
import * as http from 'http';
import * as Moment from 'moment';
import * as mplayer_server from '../server';


/**
 * A next function.
 */
export interface ApiNextFunction extends Express.NextFunction {
}

/**
 * An API request context.
 */
export interface ApiRequest extends Express.Request {
}

/**
 * An API response context.
 */
export interface ApiResponse extends Express.Response {
    /**
     * Sends a JSON result object with a code and an optional message.
     * 
     * @param {T} [data] The data.
     * @param {number} [code] The code.
     * @param {string} [msg] The optional message.
     * 
     * @chainable
     */
    sendJsonResult<T = any>(data?: T, code?: number, msg?: string): this;
}

/**
 * An API request handler.
 * 
 * @param {ApiRequest} req The request context.
 * @param {ApiResponse} resp The response context.
 * @param {ApiNextFunction} next The next function.
 * 
 * @return {any} The result.
 */
export type ApiRequestHandler = (req: ApiRequest, res: ApiResponse,
                                 next: ApiNextFunction) => any;

/**
 * An API server.
 */
export class ApiServer {
    /**
     * Stores the underlying HTTP server instance.
     */
    protected _httpServer: http.Server;
    /**
     * Stores the underlying (media player) server.
     */
    protected _SERVER: mplayer_server.Server;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {mplayer_server.Server} server The underlying HTTP server instance.
     */
    constructor(server: mplayer_server.Server) {
        this._SERVER = server;
    }

    /**
     * Returns a safe request handler.
     * 
     * @param {ApiRequestHandler} handler The input value.
     * @param {any} [thisArgs] The value / object that should be linked with the handler.
     *  
     * @returns {ApiRequestHandler} The safe handler.
     */
    protected getRequestHandlerSafe(handler: ApiRequestHandler,
                                    thisArgs?: any): ApiRequestHandler {
        if (arguments.length < 2) {
            thisArgs = this;
        }

        let result: ApiRequestHandler;

        if (handler) {
            result = function(req, resp, next) {
                try {
                    // sendJsonResult()
                    resp.sendJsonResult = function(data?: any, code = 0, msg?: string) {
                        resp.contentType('application/json; charset=utf-8')
                            .send(new Buffer(JSON.stringify({
                                code: code,
                                msg: msg,
                                data: data,
                            }), 'utf8'));
                        
                        return this;
                    };

                    return handler.apply(thisArgs, arguments);
                }
                catch (e) {
                    try {
                        resp.sendStatus(500);
                    }
                    catch (e) {
                        //TODO: log
                    }
                }
            };
        }
        else {
            result = (req, resp) => {
                try {
                    resp.sendStatus(500);
                }
                catch (e) {
                    //TODO: log
                }
            };
        }

        return result;
    }

    /**
     * Initializes an Express app instance.
     * 
     * @param {Express.Express} app The app to initialize.
     * 
     * @returns {boolean} Indicates if operation was successful or not.
     */
    protected initializeApp(app: Express.Express): boolean {
        if (!app) {
            return false;
        }

        app.get('/', this.getRequestHandlerSafe((req, resp) => {
            resp.sendJsonResult({
                now: Moment.utc().toISOString(),
                you: `${req.connection.remoteAddress}:${req.connection.remotePort}`,
            });
        }));
        
        return true;
    }

    /**
     * Gets if that server is running or not.
     */
    public get isRunning(): boolean {
        return !!this._httpServer;
    }

    /**
     * Gets the underlying (media player) server.
     */
    public get server(): mplayer_server.Server {
        return this._SERVER;
    }
    
    /**
     * Starts the server.
     * 
     * @returns {Promise<boolean>} The promise that indicates if operation was successful or not.
     */
    public start(): Promise<boolean> {
        const ME = this;

        return new Promise<boolean>((resolve, reject) => {
            if (ME.isRunning) {
                resolve(false);
                return;
            }

            try {
                const NEW_APP = Express();
                ME.initializeApp(NEW_APP);

                let newServer: http.Server;
                newServer = NEW_APP.listen(8888, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        ME._httpServer = newServer;

                        resolve(true);
                    }
                });

                newServer.once('error', (err) => {
                    if (err) {
                        reject(err);
                    }
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Stops the server.
     * 
     * @returns {Promise<boolean>} The promise that indicates if operation was successful or not.
     */
    public stop(): Promise<boolean> {
        const ME = this;

        return new Promise<boolean>((resolve, reject) => {
            try {
                const OLD_SERVER = ME._httpServer;
                if (OLD_SERVER) {
                    OLD_SERVER.close(() => {
                        ME._httpServer = null;

                        resolve(true);
                    });
                }
                else {
                    resolve(false);
                }
            }
            catch (e) {
                reject(e);
            }
        });
    }
}
