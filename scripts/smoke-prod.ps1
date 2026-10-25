# Prueba de humo del sitio publicado (SOLO LECTURA: nunca llama al reset con POST).
# Uso:  powershell -ExecutionPolicy Bypass -File scripts/smoke-prod.ps1
param([string]$BaseUrl = "https://omnimarket-operations-hub-rho.vercel.app")

function Probe([string]$Method, [string]$Path, [string]$Body = $null) {
  $url = "$BaseUrl$Path"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $params = @{ Uri = $url; Method = $Method; UseBasicParsing = $true; TimeoutSec = 60 }
    if ($Body) { $params.Body = $Body; $params.ContentType = "application/json" }
    $r = Invoke-WebRequest @params
    $status = [int]$r.StatusCode; $content = $r.Content; $headers = $r.Headers
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $status = [int]$resp.StatusCode
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $content = $reader.ReadToEnd(); $headers = $resp.Headers
    } else { $status = "ERROR"; $content = $_.Exception.Message; $headers = $null }
  }
  $sw.Stop()
  $timing = if ($headers) { $headers["Server-Timing"] } else { "" }
  $snippet = if ($content) { $content.Substring(0, [Math]::Min(160, $content.Length)) } else { "" }
  "{0,-6} {1,-42} -> {2,5}  {3,6} ms  {4}" -f $Method, $Path, $status, $sw.ElapsedMilliseconds, $timing
  "        $snippet"
}

"Sitio: $BaseUrl"
Probe GET  "/"
Probe GET  "/api/test/kanban-status"
Probe GET  "/api/test/analytics?page=1&limit=50"
Probe GET  "/api/test/analytics?page=1&limit=500"
Probe GET  "/api/test/reset-data"
Probe GET  "/api/products"
Probe PATCH "/api/orders/x/status" '{"status":"SHIPPED","position":1}'

"`nLatencia de analytics (10 llamadas en caliente):"
$times = @()
for ($i = 0; $i -lt 10; $i++) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $r = Invoke-WebRequest -Uri "$BaseUrl/api/test/analytics?page=1&limit=50" -UseBasicParsing
  $sw.Stop(); $times += $sw.ElapsedMilliseconds
  "  #{0,-2} total {1,5} ms | servidor: {2}" -f ($i + 1), $sw.ElapsedMilliseconds, $r.Headers["Server-Timing"]
}
$sorted = $times | Sort-Object
"  mediana {0} ms | p90 {1} ms (desde tu red, incluye internet)" -f $sorted[4], $sorted[8]
