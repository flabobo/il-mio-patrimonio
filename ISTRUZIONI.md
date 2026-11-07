# Il Mio Patrimonio — prima versione

## 1. Crea il database
1. Apri https://supabase.com e crea un account e un nuovo progetto.
2. Dal progetto apri **SQL Editor**, incolla tutto il contenuto di `schema.sql` ed eseguilo una sola volta.
3. In **Authentication → Providers → Email** verifica che l'accesso email/password sia abilitato. Se è richiesta la conferma email, conferma il messaggio che riceverai.
4. In **Project Settings → API** (o **Connect**, a seconda dell'interfaccia) copia il **Project URL** e la chiave **publishable** o **anon**. Non utilizzare mai `service_role` o secret key nel browser.
5. Inserisci i due valori in `config.js`, mantenendo le virgolette.

## 2. Pubblica il sito
1. Crea un repository GitHub **privato** per conservare i sorgenti. Nota: GitHub Pages su repository privati dipende dal piano e può pubblicare il sito sul web; la privacy dei dati dipende dall'autenticazione Supabase e dalle policy RLS, non dalla privacy del repository.
2. Per GitHub Pages, segui **Settings → Pages** e pubblica il branch contenente `index.html` nella cartella root. Se Pages non è disponibile, usa un servizio di hosting statico HTTPS.
3. Apri l'URL HTTPS del sito e scegli **Crea account**. Conferma l'email se richiesto.
4. Dopo aver creato l'account, in Supabase disabilita le nuove registrazioni pubbliche per evitare account non desiderati. Le policy RLS separano i dati tra utenti.
5. Su iPhone: Safari → Condividi → **Aggiungi alla schermata Home**. Sul computer: apri l'URL in un browser.

## 3. Come si usa
- Inserisci il saldo bancario iniziale e la data di riferimento. Registra solo movimenti successivi a quella data.
- I movimenti **programmati** incidono solo sul saldo futuro (entro l'orizzonte scelto).
- I movimenti **confermati** incidono sul saldo attuale, una sola volta.
- Una spesa prevista può essere confermata quando effettivamente pagata; se la data reale è diversa, modificala prima.
- Il saldo futuro = saldo attuale + somma delle operazioni programmate fino alla data selezionata.
- Esporta regolarmente i movimenti CSV e conserva una copia sicura. Il CSV non include il saldo iniziale: annotalo separatamente.

## Note importanti
- L'app non è collegata alla banca: i dati sono manuali.
- Per funzionare richiede Internet; l'installazione PWA non rende i movimenti disponibili offline.
- La chiave pubblica Supabase può essere nel client; protezione dati tramite autenticazione e RLS. Non mettere password o chiavi segrete nei file pubblicati.
- È un prototipo personale: non include ancora ricorrenze automatiche, recupero completo da backup, audit storico, riconciliazione o supporto multi-conto.
- La data futura nel browser è interpretata in base al fuso del dispositivo. Il saldo confermato include tutti i movimenti marcati confermati; per questo non si possono confermare movimenti con data futura.
