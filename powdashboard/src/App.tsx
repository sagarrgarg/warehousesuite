import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { FrappeProvider } from 'frappe-react-sdk'

import "@radix-ui/themes/styles.css";
import { Theme } from '@radix-ui/themes'


function App() {
  const [count, setCount] = useState(0)

  const getSiteName = () => {
		// @ts-ignore
		if (window.frappe?.boot?.versions?.frappe && (window.frappe.boot.versions.frappe.startsWith('15') || window.frappe.boot.versions.frappe.startsWith('16'))) {
			// @ts-ignore
			return window.frappe?.boot?.sitename ?? import.meta.env.VITE_SITE_NAME
		}
		return import.meta.env.VITE_SITE_NAME

	}


  return (
	<div className="App">
		<Theme 
		appearance="dark"
		accentColor="iris"
		panelBackground="translucent">
	  <FrappeProvider
	  socketPort={import.meta.env.VITE_SOCKET_PORT}
	  siteName={getSiteName()}
	  >
		<div>
	  <div>
		<a href="https://vitejs.dev" target="_blank">
		  <img src="/vite.svg" className="logo" alt="Vite logo" />
		</a>
		<a href="https://reactjs.org" target="_blank">
		  <img src={reactLogo} className="logo react" alt="React logo" />
		</a>
	  </div>
	  <h1>Vite + React + Frappe</h1>
	  <div className="card">
		<button onClick={() => setCount((count) => count + 1)}>
		  count is {count}
		</button>
		<p>
		  Edit <code>src/App.jsx</code> and save to test HMR
		</p>
	  </div>
	  <p className="read-the-docs">
		Click on the Vite and React logos to learn more
	  </p>
	  </div>
	  </FrappeProvider>
	  </Theme>
	</div>
  )
}

export default App
