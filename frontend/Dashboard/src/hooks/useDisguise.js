export function setDisguiseMode(enabled) {
    const manifest = document.getElementById("pwamanifest");

    // Switch manifest file
    manifest.setAttribute(
        "href",
        enabled ? "/calc/manifest.json" : "/vawcare/manifest.json"
    );

    // Save user preference
    localStorage.setItem("disguise", enabled ? "1" : "0");

    // Optional: update the page title
    document.title = enabled ? "Calculator" : "VAWCare";
}

export function loadDisguiseMode() {
    const enabled = localStorage.getItem("disguise") === "1";
    setDisguiseMode(enabled);
}
