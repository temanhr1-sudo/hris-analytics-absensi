import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'

// 🔴 GANTI TEKS INI DENGAN KODE YANG ANDA COPY DARI DASHBOARD CLERK TADI
const PUBLISHABLE_KEY = "pk_test_dmVyaWZpZWQtbXV0dC0wLmNsZXJrLmFjY291bnRzLmRldiQ"

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      
      {/* Jika User SUDAH Login, Tampilkan Aplikasi */}
      <SignedIn>
        <App />
      </SignedIn>
       
      {/* Jika User BELUM Login, Paksa Masuk ke Halaman Login */}
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

    </ClerkProvider>
  </React.StrictMode>,
)