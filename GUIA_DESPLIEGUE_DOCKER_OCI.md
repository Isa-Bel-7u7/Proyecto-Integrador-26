# Guía de entrega: Docker, GitHub Actions y OCI

La imagen contiene la aplicación web `hotel-system`, servida por Nginx en el puerto 80. La configuración de Supabase se incorpora durante la construcción como variables `VITE_*`. En Vite estas variables forman parte del cliente web; se debe usar únicamente la clave pública `anon` (o `publishable`) de Supabase, nunca la `service_role`.

## 1. Preparar Docker Hub y GitHub Actions

1. En Docker Hub, crea un repositorio público llamado `hotel-system`.
2. Crea un Access Token en Docker Hub.
3. En GitHub, abre `Isa-Bel-7u7/Proyecto-Integrador-26` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Crea estos secretos:

   | Nombre | Valor |
   | --- | --- |
   | `DOCKERHUB_USERNAME` | Tu usuario de Docker Hub |
   | `DOCKERHUB_TOKEN` | El Access Token de Docker Hub |
   | `VITE_SUPABASE_URL` | URL del proyecto Supabase |
   | `VITE_SUPABASE_ANON_KEY` | Clave pública `anon` / `publishable` de Supabase |

4. Integra estos archivos a la rama `main`. El workflow `.github/workflows/docker-publish.yml` construye la web y publica las etiquetas `latest` y el identificador del commit.
5. Abre GitHub → **Actions** → **Publicar imagen Docker en Docker Hub** y espera el resultado verde. En Docker Hub, abre `hotel-system` y captura sus etiquetas publicadas.

## 2. Probar el contenedor en Docker Desktop (Windows/PowerShell)

Desde la carpeta raíz del repositorio, reemplaza los valores de ejemplo con la URL y la clave pública anon de Supabase:

```powershell
docker build -t hotel-system:local `
  --build-arg VITE_SUPABASE_URL="https://TU-PROYECTO.supabase.co" `
  --build-arg VITE_SUPABASE_ANON_KEY="TU_CLAVE_PUBLICA_ANON" `
  .\hotel-system

docker run -d --name hotel-system -p 8080:80 hotel-system:local
docker ps
```

Abre `http://localhost:8080` y confirma que la aplicación carga. En Docker Desktop captura la vista **Containers** donde aparezca `hotel-system` activo. Al terminar la captura, conserva el contenedor para la demostración o detenlo con `docker stop hotel-system`.

## 3. Crear manualmente una VM en OCI

1. Entra a la consola de Oracle Cloud Infrastructure (OCI) y abre **Compute** → **Instances** → **Create instance**.
2. Asigna un nombre, elige Ubuntu LTS o Oracle Linux, selecciona una forma elegible para tu cuenta (por ejemplo, una forma Ampere A1 del nivel gratuito si está disponible), y genera o carga una clave SSH. Guarda la clave privada localmente; OCI no la vuelve a mostrar.
3. En la subred pública, habilita una dirección IPv4 pública efímera. Crea la instancia y anota su IP pública.
4. En la lista de seguridad asociada a la subred (Security List o NSG), agrega una regla de entrada TCP al puerto `80` desde `0.0.0.0/0`. Mantén el puerto SSH `22` limitado a tu IP cuando sea posible.
5. Captura la pantalla de detalles de la instancia en estado **Running**, mostrando la IP pública. No incluyas la clave privada en las evidencias.

La disponibilidad de formas y límites del nivel gratuito depende de la región y de la cuenta. Escoge una forma que OCI permita crear en tu tenancy.

## 4. Descargar y desplegar la imagen en la VM

Conéctate por SSH desde PowerShell usando la IP y la ruta local de tu clave privada. En Ubuntu:

```bash
ssh -i "RUTA_A_TU_CLAVE.key" ubuntu@IP_PUBLICA
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl enable --now docker
sudo docker pull TU_USUARIO_DOCKERHUB/hotel-system:latest
sudo docker run -d --name hotel-system --restart unless-stopped -p 80:80 TU_USUARIO_DOCKERHUB/hotel-system:latest
sudo docker ps
```

En Oracle Linux, usa `opc@IP_PUBLICA` para conectarte y consulta la guía de Docker de la versión elegida si `docker.io` no está disponible en sus repositorios predeterminados.

Abre `http://IP_PUBLICA` desde el navegador. Captura la terminal con `docker pull` y `docker ps`, además del navegador mostrando la aplicación y la IP pública. La aplicación requiere conectividad al proyecto Supabase configurado al construir la imagen.

## 5. Evidencias y presentación del informe

El ejemplo entregado organiza el informe con el título **CAP** y cuatro apartados con capturas. Usa ese mismo orden y reemplaza las imágenes de ejemplo por capturas reales del sistema hotelero:

1. **El Docker ejecutado en Docker Desktop**: muestra `hotel-system` activo y su imagen/puerto visibles.
2. **GitHub Actions y Docker Hub**: captura la ejecución exitosa asociada al cambio en `main` y las etiquetas `latest` y SHA publicadas en el repositorio Docker Hub. Si caben, incluye ambas capturas bajo este apartado.
3. **Creación de la VM**: captura OCI con la instancia en estado **Running** y la IP pública. Añade la terminal SSH en la que se vean la conexión a esa IP y la instalación/preparación de Docker.
4. **Comandos Docker y solución desplegada**: captura la terminal con `docker pull`, `docker run` y `docker ps`; añade la ventana del navegador cargando `http://IP_PUBLICA`.

Guarda las capturas originales en `evidencias/`, en PNG o JPG, con nombres descriptivos como `01-docker-desktop.png`, `02-github-actions.png`, `03-docker-hub.png`, `04-oci-vm.png`, `05-terminal-vm.png` y `06-app-ip-publica.png`. Inserta esas imágenes en un documento de entrega con título **CAP**, subtítulos para los cuatro apartados y una breve descripción debajo de cada captura. No uses la imagen del ejemplo como evidencia del proyecto. No edites los resultados y evita mostrar tokens, claves SSH privadas, contraseñas o secretos.

## Nota sobre el primer despliegue

El workflow se ejecutará cuando la configuración llegue a `main`. Antes, deben existir el repositorio en Docker Hub y los cuatro secretos de GitHub enumerados arriba. La VM de OCI y las capturas de la consola requieren la sesión y las credenciales del titular de la cuenta.
