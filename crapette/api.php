<?php
// Crapette : garde la partie en cours pour jouer sur deux appareils.
// GET  api.php?partie=CODE  -> l'état de la partie (404 si elle n'existe pas encore)
// POST api.php?partie=CODE  -> enregistre un coup (refusé avec 409 et l'état actuel si un coup plus récent existe déjà)
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $_GET['partie'] ?? ''));
if ($code === '' || strlen($code) > 12) { http_response_code(400); echo '{"erreur":"code de partie invalide"}'; exit; }

$dir = __DIR__ . '/parties';
if (!is_dir($dir)) {
  mkdir($dir, 0755, true);
  file_put_contents($dir . '/.htaccess', "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n");
}
$file = "$dir/$code.json";

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  if (!is_file($file)) { http_response_code(404); echo '{}'; exit; }
  readfile($file); exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }

$body = file_get_contents('php://input', false, null, 0, 300000);
$new = json_decode($body, true);
if (!is_array($new) || !isset($new['seq']) || !is_int($new['seq'])) { http_response_code(400); echo '{"erreur":"partie invalide"}'; exit; }

$fp = fopen($file, 'c+');
flock($fp, LOCK_EX);
$cur = stream_get_contents($fp);
$old = $cur ? json_decode($cur, true) : null;
if (is_array($old) && isset($old['seq']) && $old['seq'] >= $new['seq']) {
  flock($fp, LOCK_UN); fclose($fp);
  http_response_code(409); echo $cur; exit;
}
ftruncate($fp, 0); rewind($fp); fwrite($fp, $body); fflush($fp);
flock($fp, LOCK_UN); fclose($fp);

// ménage : efface les parties abandonnées depuis plus de 60 jours
if (mt_rand(1, 50) === 1) foreach (glob("$dir/*.json") as $f) if (filemtime($f) < time() - 60 * 86400) @unlink($f);
echo '{"ok":true}';
