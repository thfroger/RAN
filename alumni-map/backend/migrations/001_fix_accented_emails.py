"""
Migration 001 — Normalise les emails contenant des caractères accentués.

Les adresses email ne peuvent contenir que des caractères ASCII dans leur
partie locale (RFC 5321). Cette migration remplace les caractères accentués
par leur équivalent ASCII (ex: é→e, ç→c) pour tous les alumni concernés.

Idempotent : peut être relancé sans effet de bord.

Usage : python migrations/001_fix_accented_emails.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import SessionLocal
from unidecode import unidecode
import models


def run() -> None:
    db = SessionLocal()
    try:
        alumni_with_email = (
            db.query(models.Alumni)
            .filter(models.Alumni.email.isnot(None))
            .all()
        )

        fixed = []
        for alumni in alumni_with_email:
            if alumni.email and not alumni.email.isascii():
                old_email = alumni.email
                alumni.email = unidecode(alumni.email)
                fixed.append((alumni.first_name, alumni.last_name, old_email, alumni.email))

        if fixed:
            db.commit()
            print(f"{len(fixed)} email(s) corrigé(s) :")
            for first, last, old, new in fixed:
                print(f"  {first} {last}: {old!r} → {new!r}")
        else:
            print("Aucun email accentué trouvé — rien à faire.")

    finally:
        db.close()


if __name__ == "__main__":
    run()
