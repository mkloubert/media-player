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

import * as mplayer_api_server from './api/server';


/**
 * A server instance.
 */
export class Server {
    /**
     * Stores the current API server.
     */
    protected _api: mplayer_api_server.ApiServer;
    /**
     * Stores if the server is running or not.
     */
    protected _isRunning = false;

    /**
     * Gets the current API instance.
     */
    public get api(): mplayer_api_server.ApiServer {
        return this._api;
    }

    /**
     * Gets if the server is running or not.
     */
    public get isRunning(): boolean {
        return this._isRunning;
    }

    /**
     * Disposes the old API server.
     * 
     * @param {boolean} [throwOnError] Throw exception on error or not.
     * 
     * @returns {Promise<boolean>} The promise that indicates if operation was successful or not.
     */
    protected async disposeOldApi(throwOnError = true): Promise<boolean> {
        try {
            const OLD_API = this._api;
            if (OLD_API) {
                await OLD_API.stop();
            }

            return true;
        }
        catch (e) {
            if (throwOnError) {
                throw e;
            }

            return false;
        }
    }
    
    /**
     * Starts the server.
     * 
     * @returns {Promise<boolean>} The promise that indicates if operation was successful or not.
     */
    public start(): Promise<boolean> {
        const ME = this;

        return new Promise<boolean>(async (resolve, reject) => {
            if (ME.isRunning) {
                resolve(false);
                return;
            }

            try {
                await ME.disposeOldApi();

                const NEW_API = new mplayer_api_server.ApiServer(ME);
                await NEW_API.start();

                ME._api = NEW_API;

                ME._isRunning = true;

                //TODO

                resolve(true);
            }
            catch (e) {
                await this.disposeOldApi(false);

                ME._isRunning = false;

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

        return new Promise<boolean>(async (resolve, reject) => {
            if (!ME.isRunning) {
                resolve(false);
                return;
            }

            try {
                await ME.disposeOldApi();

                ME._isRunning = false;

                resolve(true);
            }
            catch (e) {
                ME._isRunning = true;

                reject(e);
            }
        });
    }
}
