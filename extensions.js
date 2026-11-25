/* Compléments au portail, gardés hors d'index.html pour survivre à ses republications.
   Chargé après le script principal (balise remise par .github/workflows/garde-portail.yml). */
(function () {
  "use strict";
  if (!CONFIG.apercu && !CONFIG.tally && !CONFIG.endpoint) { const b = $("#bandeau"); b.hidden = false; b.textContent = "Enregistrement des actions désactivé : vos actions restent sur cet ordinateur et ne parviennent pas à l'équipe Diaspora Connect. Prévenez " + EMAIL_RECRUTEMENT + "."; }

  /* dossier candidat (équipe) : décision et motif de chaque entreprise */
  function decisionsHtml(c) {
    const S = etatEquipe(), L = [];
    D.entreprises.forEach(e => e.offres.forEach(o => { if (o.candidats.some(x => x.id === c.id)) L.push({e, o, d: S.dec[e.id + "|" + o.id + "|" + c.id]}); }));
    if (!L.length) return "";
    return `<div class="zone" style="margin:10px 0"><b>Décision des entreprises</b>${L.map(l => `<div style="margin:6px 0"><b>${esc(l.e.nom)}</b> · ${PN(l.o)} ${l.d ? (l.d.decision === "accepte" ? '<span class="pastille v">Validée</span>' : '<span class="pastille g">Refusée</span>') + `<span class="meta"> le ${FR(l.d.quand)}</span>` + (l.d.decision === "refus" && l.d.motif ? `<div class="meta"><b>Motif du refus :</b> ${esc(l.d.motif)}</div>` : "") : '<span class="pastille">En attente de décision</span>'}</div>`).join("")}</div>`;
  }
  if (typeof window.positionnementsHtml !== "function") window.positionnementsHtml = decisionsHtml;
  if (typeof window.decisionsHtml !== "function") window.decisionsHtml = decisionsHtml;

  /* renvoie à Tally ce que ce navigateur a gardé mais que le journal n'a pas ; 30 min de marge pour la synchro */
  function rattraper(ev) {
    const vu = new Set(ev.map(e => [e.action, e.offre, e.candidat || "", e.decision || ""].join("|")));
    const topJ = new Set(ev.filter(e => e.action === "top3").map(e => e.offre));
    const limite = new Date(Date.now() - 30 * 60000).toISOString(), R = ST.renvoi = ST.renvoi || {}, file = [];
    const ajoute = (cle, quand, action, p) => { if (!R[cle] && !vu.has(cle) && quand && quand < limite) file.push([cle, action, Object.assign(p, {quand_origine: quand, renvoi: true})]); };
    Object.entries(ST.dec || {}).forEach(([k, v]) => { const [offre, candidat] = k.split("|");
      if (v.d) ajoute(["decision", offre, candidat, v.d].join("|"), v.quand, "decision", {offre, candidat, decision: v.d, motif: v.motif});
      if (v.entretien) ajoute(["email", offre, candidat, ""].join("|"), v.entretien.quand, "email", {offre, candidat, mode: v.entretien.mode, objet: v.entretien.objet, planification: v.plan});
      if (v.bc) ajoute(["business_case", offre, candidat, ""].join("|"), v.bc.quand, "business_case", {offre, candidat, objet: v.bc.objet, restitution: v.bc.restitution}); });
    Object.entries(ST.top || {}).forEach(([offre, cl]) => { if (!topJ.has(offre) && (cl || []).some(Boolean)) ajoute(["top3", offre, "", ""].join("|"), limite.slice(0, 10), "top3", {offre, classement: cl}); });
    return file.reduce((pr, [cle, action, p]) => pr.then(() => envoyer(action, p)).then(r => { if (r && r.ok) { R[cle] = 1; sauver(); } }), Promise.resolve());
  }
  let fait = false;
  async function lancer() {
    if (fait || !CONFIG.tally || !AESK || !D || D.equipe) return;
    fait = true;
    try {
      const r = await fetch("j/" + TAG + ".enc?t=" + Date.now());
      if (r.status === 404) return rattraper([]);
      if (!r.ok) { fait = false; return; }
      const raw = new Uint8Array(await r.arrayBuffer());
      rattraper(JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name: "AES-GCM", iv: raw.slice(0, 12)}, AESK, raw.slice(12)))));
    } catch (_) { fait = false; }
  }
  const restaurer0 = restaurer;
  restaurer = async function () { await restaurer0(); fait = false; await lancer(); };   // eslint-disable-line no-global-assign
  lancer();   // si la reconnexion automatique a déjà ouvert l'espace avant le chargement de ce fichier
  window.rattraperPortail = rattraper;
})();
