const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || "1717";
const DATA_FILE = path.join(__dirname, "game-data.json");

const defaultData = {
  title: "OPÉRATION COPENHAGUE",
  subtitle: "Mission confidentielle — POP",
  durationMinutes: 60,
  intro: "Agent, le Fantôme a disparu. Retrouvez les indices, recoupez les preuves et rejoignez le point final avant la fin du compte à rebours.",
  theme: { primary: "#C8102E", background: "#FFF8F8", text: "#24191B" },
  routes: {
    alpha: { name: "POP ALPHA", intro: "Votre équipe récupère la première partie du dossier. Chaque preuve vous rapproche du dernier signal du Fantôme.", missions: [
      { id: "A1", title: "Briefing confidentiel", text: "Lisez le message remis par l'animateur et déchiffrez le nom de code de l'agent disparu.", location: "Point de départ à définir", photo: "", mapsUrl: "", answer: "fantome|le fantôme", hint: "Le nom évoque quelqu'un qu'on ne voit pas." },
      { id: "A2", title: "Le détail architectural", text: "Repérez sur place un détail d'architecture décrit par l'animateur. Prenez une photo de toute l'équipe devant ce détail.", location: "Lieu à définir", photo: "", mapsUrl: "", answer: "", hint: "Observez les façades, les portes et les décorations." },
      { id: "A3", title: "Code rouge et blanc", text: "Scannez le QR code dissimulé par l'animateur et recopiez le code qu'il révèle.", location: "QR code à placer", photo: "", mapsUrl: "", answer: "e17", hint: "Le dossier porte une lettre et deux chiffres." },
      { id: "A4", title: "Observation de rue", text: "Sur la rue indiquée, trouvez une enseigne ou une inscription précise. Notez exactement le mot demandé dans l'enveloppe.", location: "Rue de Copenhague à définir", photo: "", mapsUrl: "", answer: "", hint: "Ne traversez pas sans regarder et restez groupés." },
      { id: "A5", title: "L'heure de la transmission", text: "Reconstituez l'heure à partir des chiffres sur la photo-indice. Entrez l'heure au format HH:MM.", location: "Photo-indice à placer", photo: "", mapsUrl: "", answer: "16:20", hint: "L'heure est comprise entre 16 h et 17 h." },
      { id: "A6", title: "Message sous enveloppe", text: "Trouvez l'enveloppe numérotée par l'animateur. Lisez l'indice et répondez à la question inscrite à l'intérieur.", location: "Cachette autorisée à définir", photo: "", mapsUrl: "", answer: "", hint: "Cherchez uniquement dans les endroits autorisés." },
      { id: "A7", title: "Preuve photographique", text: "Reproduisez la pose visible sur la photo fournie et prenez une photo d'équipe. Montrez-la à l'animateur si nécessaire.", location: "Lieu à définir", photo: "", mapsUrl: "", answer: "", hint: "Tout le monde doit apparaître sur la photo." },
      { id: "A8", title: "Coordonnées du rendez-vous", text: "Utilisez les indices récoltés pour déterminer la zone du dernier signal. Gardez cette preuve pour le rassemblement final.", location: "À déterminer grâce aux indices", photo: "", mapsUrl: "", answer: "nord", hint: "Le mot désigne une direction cardinale." }
    ]},
    bravo: { name: "POP BRAVO", intro: "Votre équipe doit retrouver des preuves complémentaires et vérifier les informations du dossier E-17.", missions: [
      { id: "B1", title: "Transmission interceptée", text: "Cherchez le QR code placé par l'animateur et scannez-le pour découvrir le premier indice.", location: "QR code à placer", photo: "", mapsUrl: "", answer: "", hint: "Regardez les supports et panneaux autorisés autour de vous." },
      { id: "B2", title: "Le contact secret", text: "Lisez le message retrouvé et identifiez le prénom du contact de l'agent.", location: "Enveloppe à placer", photo: "", mapsUrl: "", answer: "freja", hint: "C'est un prénom danois." },
      { id: "B3", title: "La rue témoin", text: "Rendez-vous à la rue indiquée par l'animateur. Trouvez l'inscription photographiée et confirmez le mot manquant.", location: "Rue de Copenhague à définir", photo: "", mapsUrl: "", answer: "", hint: "Comparez les détails de la photo et le lieu réel." },
      { id: "B4", title: "Architecture sous surveillance", text: "Observez la façade indiquée. Comptez le nombre d'éléments demandés dans la consigne et entrez le résultat.", location: "Bâtiment à définir", photo: "", mapsUrl: "", answer: "", hint: "Comptez uniquement les éléments visibles depuis l'espace public." },
      { id: "B5", title: "Le dossier E-17", text: "Assemblez les fragments du dossier remis dans les missions précédentes. Quel est son identifiant ?", location: "Indice papier ou photo à placer", photo: "", mapsUrl: "", answer: "e17|e-17", hint: "La lettre est suivie de deux chiffres." },
      { id: "B6", title: "Photo du témoin", text: "Retrouvez le lieu représenté sur la photo et prenez une photo de votre équipe depuis un point de vue comparable.", location: "Photo à fournir", photo: "", mapsUrl: "", answer: "", hint: "Comparez les formes, les couleurs et les repères de la rue." },
      { id: "B7", title: "Confirmation horaire", text: "À partir de l'indice, confirmez l'heure à laquelle le dossier a été transmis.", location: "Enveloppe ou QR code à placer", photo: "", mapsUrl: "", answer: "16:20", hint: "Écrivez l'heure avec deux chiffres, deux-points, deux chiffres." },
      { id: "B8", title: "Dernier signal", text: "Quel secteur est mentionné par le dernier message ? Gardez la réponse pour la réunion des deux équipes.", location: "Dernier indice à placer", photo: "", mapsUrl: "", answer: "nord", hint: "Il s'agit d'une direction, pas d'un nom de personne." }
    ]}
  },
  final: { title: "Point de convergence", text: "Les deux équipes doivent réunir leurs indices pour révéler le lieu de rendez-vous final.", location: "À définir par l'animateur", photo: "", mapsUrl: "" }
};

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2)); return structuredClone(defaultData); }
}
let game = loadData();
let sessions = new Map();
let timer = { startedAt: null, endsAt: null, pausedRemainingMs: null, running: false };

app.use(express.json({ limit: "8mb" }));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-secret-before-public-deployment",
  resave: false, saveUninitialized: true,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 12 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, "public")));

function cleanupSessions() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastSeen > 45 * 60 * 1000) sessions.delete(id);
  }
}
function publicState(req) {
  cleanupSessions();
  return {
    game, timer,
    activeSessions: sessions.size,
    mySession: sessions.has(req.sessionID),
    serverTime: Date.now()
  };
}
app.get("/api/state", (req, res) => res.json(publicState(req)));

app.post("/api/join", (req, res) => {
  cleanupSessions();
  if (sessions.has(req.sessionID)) {
    sessions.get(req.sessionID).lastSeen = Date.now();
    return res.json({ ok: true, ...publicState(req) });
  }
  if (sessions.size >= 2) return res.status(429).json({ ok: false, error: "Les deux sessions de jeu sont déjà utilisées. Demandez à l'animateur de libérer une session." });
  sessions.set(req.sessionID, { lastSeen: Date.now(), team: req.body.team === "bravo" ? "bravo" : "alpha" });
  if (!timer.running && timer.startedAt === null) {
    timer.startedAt = Date.now();
    timer.endsAt = Date.now() + Number(game.durationMinutes || 60) * 60 * 1000;
    timer.running = true;
  }
  res.json({ ok: true, ...publicState(req) });
});
app.post("/api/heartbeat", (req, res) => {
  if (sessions.has(req.sessionID)) sessions.get(req.sessionID).lastSeen = Date.now();
  res.json(publicState(req));
});
app.post("/api/leave", (req, res) => {
  sessions.delete(req.sessionID);
  res.json({ ok: true, ...publicState(req) });
});

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(401).json({ error: "Accès administrateur requis." });
}
app.post("/api/admin/login", (req, res) => {
  if (String(req.body.pin || "") !== ADMIN_PIN) return res.status(403).json({ ok: false, error: "Code incorrect." });
  req.session.isAdmin = true;
  res.json({ ok: true });
});
app.post("/api/admin/logout", (req, res) => { req.session.isAdmin = false; res.json({ ok: true }); });
app.put("/api/admin/game", requireAdmin, (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== "object") return res.status(400).json({ error: "Données invalides." });
  game = incoming;
  game.durationMinutes = Math.max(1, Math.min(240, Number(game.durationMinutes) || 60));
  fs.writeFileSync(DATA_FILE, JSON.stringify(game, null, 2));
  // If the game hasn't started yet, apply the new duration immediately.
  if (timer.startedAt === null) timer.running = false;
  res.json({ ok: true, game });
});
app.post("/api/admin/timer", requireAdmin, (req, res) => {
  const action = req.body.action;
  const now = Date.now();
  if (action === "start" || action === "reset") {
    timer.startedAt = now;
    timer.endsAt = now + Number(game.durationMinutes || 60) * 60 * 1000;
    timer.pausedRemainingMs = null;
    timer.running = true;
  } else if (action === "pause" && timer.running && timer.endsAt) {
    timer.pausedRemainingMs = Math.max(0, timer.endsAt - now);
    timer.running = false;
  } else if (action === "resume" && !timer.running && timer.pausedRemainingMs !== null) {
    timer.startedAt = now;
    timer.endsAt = now + timer.pausedRemainingMs;
    timer.pausedRemainingMs = null;
    timer.running = true;
  }
  res.json({ ok: true, timer });
});
app.post("/api/admin/clear-sessions", requireAdmin, (req, res) => {
  sessions.clear();
  res.json({ ok: true });
});
app.get("/api/qr", async (req, res) => {
  const target = String(req.query.text || "");
  if (!target) return res.status(400).send("Paramètre text manquant");
  try {
    const dataUrl = await QRCode.toDataURL(target, { width: 420, margin: 2, errorCorrectionLevel: "M" });
    res.json({ dataUrl });
  } catch { res.status(500).json({ error: "Impossible de générer ce QR code." }); }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.listen(PORT, () => console.log(`OPÉRATION COPENHAGUE disponible sur http://localhost:${PORT}`));
