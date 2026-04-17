$lines = Get-Content .\style.css -Encoding UTF8
$utf8NoBom = New-Object System.Text.UTF8Encoding($False)

$variables = $lines[0..110]
[System.IO.File]::WriteAllLines("$pwd\css\variables.css", $variables, $utf8NoBom)

$layout = @()
$layout += $lines[111..493]
$layout += $lines[588..1347]
$layout += $lines[2728..3356]
$layout += $lines[3442..($lines.Count - 1)]
[System.IO.File]::WriteAllLines("$pwd\css\layout.css", $layout, $utf8NoBom)

$tablero = $lines[1348..1428]
[System.IO.File]::WriteAllLines("$pwd\css\componentes\tablero.css", $tablero, $utf8NoBom)

$notas = @()
$notas += $lines[1429..2727]
$notas += $lines[3357..3441]
[System.IO.File]::WriteAllLines("$pwd\css\componentes\notas.css", $notas, $utf8NoBom)

$botones = $lines[494..587]
[System.IO.File]::WriteAllLines("$pwd\css\componentes\botones.css", $botones, $utf8NoBom)
