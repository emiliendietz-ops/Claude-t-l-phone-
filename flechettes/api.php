<?php
// Darts Score : transmet les fléchettes détectées par le PC des caméras (cameras.html) à l'iPad (index.html).
// POST api.php?code=CODE  {"t":"dart","n":20,"m":3,"x":..,"y":..} | {"t":"takeout"} | {"t":"hb"} (le PC est en ligne)
// GET  api.php?code=CODE&since=ID  -> {"last":ID, "events":[...], "hb":secondes depuis le dernier signal du PC}
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $_GET['code'] ?? ''));
if ($code === '' || strlen($code) > 12) { http_response_code(400); echo '{"erreur":"code invalide"}'; exit; }

$dir = __DIR__ . '/cibles';
if (!is_dir($dir)) {
  mkdir($dir, 0755, true);
  file_put_contents($dir . '/.htaccess', "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n");
}
$file = "$dir/$code.json";

function lire($fp) { $s = stream_get_contents($fp); $d = $s ? json_decode($s, true) : null; return is_array($d) ? $d : ['last' => 0, 'hb' => 0, 'events' => []]; }

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $since = intval($_GET['since'] ?? -1);
  $d = is_file($file) ? json_decode(file_get_contents($file), true) : null;
  if (!is_array($d)) $d = ['last' => 0, 'hb' => 0, 'events' => []];
  $ev = $since < 0 ? [] : array_values(array_filter($d['events'], fn($e) => $e['id'] > $since));
  echo json_encode(['last' => $d['last'], 'events' => $ev, 'hb' => $d['hb'] ? time() - $d['hb'] : null]);
  exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }

$in = json_decode(file_get_contents('php://input', false, null, 0, 2000), true);
if (!is_array($in) || !in_array($in['t'] ?? '', ['dart', 'takeout', 'hb'], true)) { http_response_code(400); echo '{"erreur":"message invalide"}'; exit; }

$fp = fopen($file, 'c+');
flock($fp, LOCK_EX);
$d = lire($fp);
$d['hb'] = time();
if ($in['t'] !== 'hb') {
  $e = ['id' => $d['last'] + 1, 't' => $in['t']];
  if ($in['t'] === 'dart') {
    $e['n'] = max(0, min(25, intval($in['n'] ?? 0)));
    $e['m'] = max(1, min(3, intval($in['m'] ?? 1)));
    if (isset($in['x'], $in['y'])) { $e['x'] = round(floatval($in['x']), 1); $e['y'] = round(floatval($in['y']), 1); }
  }
  $d['events'][] = $e;
  $d['events'] = array_slice($d['events'], -50);
  $d['last'] = $e['id'];
}
ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($d)); fflush($fp);
flock($fp, LOCK_UN); fclose($fp);

// ménage : efface les codes inutilisés depuis 30 jours
if (mt_rand(1, 100) === 1) foreach (glob("$dir/*.json") as $f) if (filemtime($f) < time() - 30 * 86400) @unlink($f);
echo json_encode(['ok' => true, 'last' => $d['last']]);
