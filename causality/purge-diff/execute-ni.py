import csv
import subprocess
import re
import sys


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

def run_nativeimage_with_purges(ni_args, purgeMethods):
    proc = subprocess.run(
        ["mx",
         "-p",
         f'{sys.path[0]}/../../graal/substratevm',
         "native-image"]
        +
        ni_args
        + # The following args are concatenated at the end in order to overwrite possibly conflicting options in ni_args
        ["-H:+PrintAnalysisCallTree",
         "-H:PrintAnalysisCallTreeType=CSV",
         "-H:+ExitAfterAnalysis",
         "-H:PurgeMethodsFile=/dev/stdin"],
        input='\n'.join(purgeMethods).encode(),
        stdout=subprocess.PIPE, shell=False)

    if proc.returncode != 0:
        print(f'Native-Image exited with error code {proc.returncode}')
        exit(1)

    m = re.search(r"\n# Printing call tree csv file for methods to: (?P<file>.*)\n", proc.stdout.decode())

    if not m:
        print("Native-Image didn't generate the expected file of used methods or changed it's output format. Raw output:")
        print(proc.stdout.decode())
        exit(1)

    return method_names_from_calltree_csv(m['file'])

# Some dynamically generated Lambda methods introduce noise into the comparison, since their automatically assigned numbers vary indeterministically.
# Luckily, they all are methods whose name or the name of the defining class begins with '$'
def strip_anonymous_methods(methods):
    return [m for m in methods if not re.search(r"^(|.*\.)(\$[^.]*\.[^.]+|[^.]+\.\$[^.]*)\(.*\)$", m)]

ni_args = sys.argv[1:]
purgeMethods = [line for line in sys.stdin]

all_methods = run_nativeimage_with_purges(ni_args, [])
remaining_methods = run_nativeimage_with_purges(ni_args, purgeMethods)

new = strip_anonymous_methods(set(remaining_methods) - set(all_methods))
purged = strip_anonymous_methods(set(all_methods) - set(remaining_methods))

print("\n".join(purged), file=sys.stdout)

if len(new) > 0:
    print("Warning! Some methods appeared in the universum of the purged run:\n" + "\n".join(new), file=sys.stderr)

# Interessante Erkenntnis:
#  com.oracle.svm.core.posix.headers.Semaphore$NoTransitions.sem_init(com.oracle.svm.core.posix.headers.Semaphore$sem_t,org.graalvm.word.SignedWord,org.graalvm.word.UnsignedWord)
#  com.oracle.svm.core.posix.linux.LinuxVMSemaphore.init()
# Sind manchmal drin und manchmal nicht (unabhängig vom ersten/zweiten Lauf)