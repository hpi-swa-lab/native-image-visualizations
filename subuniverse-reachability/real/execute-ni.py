import csv
import subprocess
import re

def method_names_from_calltree_csv(path):
    included_method_names = []

    with open(path) as csvfile:
        r = csv.DictReader(csvfile)
        for line in r:
            type = line["Type"]
            name = line["Name"]
            parameters = line["Parameters"]

            if parameters == "empty":
                parameters = ""
            else:
                parameters = parameters.replace(' ', ',')

            included_method_names.append(f'{type}.{name}({parameters})')

    return included_method_names

def run_nativeimage_with_purges(classPath, mainClass, purgeMethods):
    proc = subprocess.run(
        f'mx -p "../graal/substratevm" native-image -cp {";".join(classPath)} {mainClass} -H:+PrintAnalysisCallTree -H:PrintAnalysisCallTreeType=CSV -H:+ExitAfterAnalysis -H:PurgeMethodsFile=/dev/stdin',
        input='\n'.join(purgeMethods).encode(),
        stdout=subprocess.PIPE, shell=True)

    if proc.returncode != 0:
        print(f'Native-Image exited with error code {proc.returncode}')
        exit(1)

    m = re.search(r"\n# Printing call tree csv file for methods to: (?P<file>.*)\n", proc.stdout.decode())

    if not m:
        print("Native-Image didn't generate the expected file of used methods or changed it's output format.")
        exit(1)

    return method_names_from_calltree_csv(m['file'])

def strip_anonymous_methods(methods):
    return [m for m in methods if not re.search(r"^(|.*\.)(\$[^.]*\.[^.]+|[^.]+\.\$[^.]*)\(.*\)$", m)]

mainClass = "VirtualHelloWorld"
classPath = ["../../samples/virtual-helloworld/"]

all_methods = run_nativeimage_with_purges(classPath, mainClass, [])
remaining_methods = run_nativeimage_with_purges(classPath, mainClass, ["VirtualHelloWorld.setInstance()"])



new = strip_anonymous_methods(set(remaining_methods) - set(all_methods))
purged = strip_anonymous_methods(set(all_methods) - set(remaining_methods))
print("Purged:\n " + "\n ".join(purged))
print("New:\n " + "\n ".join(new))

# Interessante Erkenntnis:
#  com.oracle.svm.core.posix.headers.Semaphore$NoTransitions.sem_init(com.oracle.svm.core.posix.headers.Semaphore$sem_t,org.graalvm.word.SignedWord,org.graalvm.word.UnsignedWord)
#  com.oracle.svm.core.posix.linux.LinuxVMSemaphore.init()
# Sind manchmal drin und manchmal nicht (unabhängig vom ersten/zweiten Lauf)

# Purge funktioniert auch noch nicht perfekt: Poco.<init> lässt den Typ im AllInstantiatedTypeFlow liegen, Poco.toString tut gar nichts...