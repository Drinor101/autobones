// Shared by the test fixtures. Describes what a skeleton currently looks like in the DOM.
// Returns zeros when the element does not exist yet, so tests can poll for it.
window.probe = function probe(selector) {
  var root = document.querySelector(selector);
  var summary = {
    text: 0, media: 0, box: 0, surface: 0, total: 0, overlays: 0, overlayHidden: null,
    rootClass: false, loadingClass: false, fading: false, busy: null, inert: false, minHeight: "", animation: null,
  };
  if (!root) return summary;
  var overlays = root.querySelectorAll(":scope > .ab-overlay");
  var overlay = overlays[0];
  if (overlay) {
    overlay.querySelectorAll("[data-kind]").forEach(function (el) {
      summary[el.dataset.kind]++;
    });
    summary.total = overlay.children.length;
    summary.overlayHidden = overlay.getAttribute("aria-hidden");
  }
  summary.overlays = overlays.length;
  summary.rootClass = root.classList.contains("ab-root");
  summary.loadingClass = root.classList.contains("ab-loading");
  summary.fading = root.classList.contains("ab-fading");
  summary.busy = root.getAttribute("aria-busy");
  summary.inert = root.hasAttribute("inert");
  summary.minHeight = root.style.minHeight;
  summary.animation = root.getAttribute("data-ab-animation");
  return summary;
};
