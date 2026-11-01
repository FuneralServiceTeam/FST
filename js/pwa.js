(() => {
  const status = document.getElementById("connectionStatus");
  function update() {
    if (!status) return;
    status.textContent = navigator.onLine ? "Online" : "Offline · cached data";
    status.classList.toggle("offline", !navigator.onLine);
  }
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(err => console.warn("PWA offline support could not start:", err));
    });
  }
})();
