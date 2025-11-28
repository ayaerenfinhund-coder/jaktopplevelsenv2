import os
import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional

# Initialiser Firebase Admin SDK
# Vi bruker en try-except blokk for å unngå feil hvis den allerede er initialisert (f.eks. ved reload)
try:
    # I produksjon bør du bruke credentials.Certificate('path/to/serviceAccountKey.json')
    # For lokal testing uten service account kan dette fungere for public keys, 
    # men verify_id_token krever ofte credentials.
    # Vi prøver å initialisere uten credentials først (application default), 
    # eller bare med prosjekt-ID hvis tilgjengelig.
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred, {
        'projectId': 'jaktopplevelsen-74086', # Din prosjekt-ID
    })
except ValueError:
    pass # Allerede initialisert
except Exception as e:
    print(f"Warning: Could not initialize Firebase Admin: {e}")
    # Fallback for dev uten credentials fil
    try:
        if not firebase_admin._apps:
            firebase_admin.initialize_app(options={'projectId': 'jaktopplevelsen-74086'})
    except:
        pass

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Validerer Firebase ID token og returnerer brukerinfo.
    """
    try:
        # Prøv å verifisere token med Firebase Admin
        # Dette krever at Admin SDK er riktig satt opp med credentials.
        # Hvis vi mangler credentials lokalt, kan dette feile.
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        return {
            "id": uid, 
            "email": decoded_token.get('email'),
            "name": decoded_token.get('name', 'Ukjent')
        }
    except Exception as e:
        print(f"Token validation error: {e}")
        
        # FALLBACK FOR UTVIKLING (hvis Firebase validering feiler pga manglende server-credentials)
        # I produksjon må dette fjernes!
        if os.getenv("DEBUG", "False").lower() == "true":
            # Vi godtar tokenet "blindt" i dev hvis validering feiler, 
            # for å la deg teste frontend/backend flyten uten service account fil.
            # Dette er usikkert, men nødvendig hvis du ikke har lastet ned json-nøkkelen.
            return {"id": "dev_user_id", "email": "dev@example.com", "name": "Dev User"}
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ugyldig autentiseringstoken",
            headers={"WWW-Authenticate": "Bearer"},
        )
