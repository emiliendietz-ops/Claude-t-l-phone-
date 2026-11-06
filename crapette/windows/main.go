// Crapette pour Windows : sert le jeu en local et l'ouvre dans le navigateur.
package main

import (
	_ "embed"
	"fmt"
	"net"
	"net/http"
	"os/exec"
	"runtime"
)

//go:embed index.html
var page string

const head = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>`

func openBrowser(url string) {
	switch runtime.GOOS {
	case "windows":
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		exec.Command("open", url).Start()
	default:
		exec.Command("xdg-open", url).Start()
	}
}

func main() {
	// Port fixe pour que le navigateur retrouve la partie en cours d'une fois sur l'autre.
	ln, err := net.Listen("tcp", "127.0.0.1:47652")
	if err != nil {
		ln, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			fmt.Println("Impossible de démarrer le jeu :", err)
			fmt.Scanln()
			return
		}
	}
	url := "http://" + ln.Addr().String() + "/"
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, head+page+"</body></html>")
	})
	fmt.Println("La Crapette est ouverte dans votre navigateur :", url)
	fmt.Println("Laissez cette fenêtre ouverte pendant la partie. Fermez-la pour quitter.")
	openBrowser(url)
	http.Serve(ln, nil)
}
