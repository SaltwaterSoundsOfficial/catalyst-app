// Demo: images live next to the page, not on a PC drive.
(() => { const orig = U.fileUrl; U.fileUrl = (p) => (/^art\//.test(String(p || '')) ? p : orig(p)); })();
