# MPWS2022RH1

## Interessante `native-image`-Optionen:
- `--expert-options-all`  
Gibt **alle** Befehle aus. Es empfiehlt sich `grep`.
- `-H:+ExitAfterAnalysis`  
Macht nur Points-To-Analyse und ggf. Ausgaben, kein Image compilen. Spart Zeit.
- `-H:+PrintAnalysisCallTree`  
Gibt den Call-Tree in ASCII-Art aus. Nützlich zum schnellen manuellen Suchen.
- `-H:+PrintAnalysisCallTree -H:PrintAnalysisCallTreeType=CSV`  
Gibt den Call-Tree in mehreren CSV-Dateien aus. Nützlich zum maschinellen Verarbeiten.
- `--debug-attach`  
Wartet auf einen Java-Debugger auf Port 8000.