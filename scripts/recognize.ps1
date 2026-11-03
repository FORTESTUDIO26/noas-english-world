# Runs the Windows en-US speech recogniser on each WAV listed in a manifest,
# restricted to a grammar of competing phrases. Prints JSON results.
param([string]$Manifest)
Add-Type -AssemblyName System.Speech
$m = Get-Content -Raw -Encoding UTF8 $Manifest | ConvertFrom-Json
$culture = New-Object System.Globalization.CultureInfo('en-US')
$engines = @{}
foreach ($g in $m.grammars.PSObject.Properties) {
  $e = New-Object System.Speech.Recognition.SpeechRecognitionEngine($culture)
  $choices = New-Object System.Speech.Recognition.Choices
  foreach ($p in $g.Value) { $choices.Add([string]$p) }
  $gb = New-Object System.Speech.Recognition.GrammarBuilder
  $gb.Culture = $culture
  $gb.Append($choices)
  $e.LoadGrammar((New-Object System.Speech.Recognition.Grammar($gb)))
  $engines[$g.Name] = $e
}
$out = New-Object System.Collections.ArrayList
foreach ($it in $m.items) {
  $e = $engines[$it.grammar]
  $e.SetInputToWaveFile($it.wav)
  $r = $e.Recognize()
  if ($r) { [void]$out.Add(@{ wav = $it.wav; text = $r.Text; confidence = [double]$r.Confidence }) }
  else { [void]$out.Add(@{ wav = $it.wav; text = ''; confidence = 0 }) }
  $e.SetInputToNull()
}
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$out | ConvertTo-Json -Compress -Depth 3
