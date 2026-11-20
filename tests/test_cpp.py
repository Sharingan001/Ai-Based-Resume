import random
import subprocess
import unittest
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

EXE = Path(__file__).resolve().parents[1] / "cpp/build/nexus_score.exe"

@unittest.skipUnless(EXE.exists(), "Build cpp/build.ps1 first")
class CppChecks(unittest.TestCase):
    def test_boundary_and_invalid_input(self):
        cases = [(["80","100","50","75"],0,"81.5"), (["100"]*4,0,"99.9"), (["0"]*4,0,"0"), (["-1","100","50","75"],1,None), (["nan","1","1","1"],1,None), (["inf","1","1","1"],1,None), (["80x","1","1","1"],1,None), ([],2,None)]
        for args, code, output in cases:
            with self.subTest(args=args):
                result = subprocess.run([str(EXE), *args], capture_output=True, text=True)
                self.assertEqual(result.returncode, code)
                if output is not None:
                    self.assertEqual(result.stdout.strip(), output)

    def test_random_score_parity(self):
        randomizer = random.Random(42)
        for _ in range(100):
            values = [randomizer.randint(0,100) for _ in range(4)]
            expected = min(Decimal("99.9"), sum(Decimal(w)*v for w,v in zip([".55",".25",".1",".1"], values))).quantize(Decimal(".1"), rounding=ROUND_HALF_UP)
            result = subprocess.run([str(EXE), *map(str, values)], capture_output=True, text=True, check=True)
            self.assertEqual(Decimal(result.stdout.strip()), expected)
