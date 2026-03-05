/*! coi-serviceworker v0.1.7 | MIT License | https://github.com/gzuidhof/coi-serviceworker */
if (typeof window === "undefined") {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("fetch", (event) => {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
            return;
        }

        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => { console.error(e); throw e; })
        );
    });
} else {
    (() => {
        const scriptUrl = document.currentScript ? document.currentScript.src : null;
        if (scriptUrl) {
            const url = new URL(scriptUrl);
            if (url.searchParams.get("reload") !== "false") {
                navigator.serviceWorker.register(scriptUrl).then((registration) => {
                    registration.addEventListener("updatefound", () => {
                        location.reload();
                    });
                    if (registration.active && !navigator.serviceWorker.controller) {
                        location.reload();
                    }
                });
            }
        }
    })();
}
