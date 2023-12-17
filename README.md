## Horizontally scaling chat app
### App Overview

### Features
- Send and receive messages
- Show current connection count

### Technologies
1. Typescript 
1. Fastify - Backend
1. Websockets - Realtime 
1. Next.js - Frontend
1. Tailwind & Shadcn UI - Styling
1. Redis - Pub/Sub
1. Caddy - Loadd Balancer
1. Docker/docker-compose - Containerization
1. GitHub actions - CI/CD
1. DigitalOcean - Host the backend
1. Vercel - Host the frontend

### Local setup

```bash
git clone https://github.com/Ajaydeep123/Chat_anon.git
cd Chat_anon
```
- Change the url in the Caddyfile
```bash
{
    debug
}

http://127.0.0.1 {
    reverse_proxy chat-app-1:3001 chat-app-2:4000 chat-app-3:5000 {
        header_down Strict-Transport-Security max-age=315360000
    }
}
```
- Run the backend server  
```bash
cd chatapp
pnpm install
vi run.sh  // create a run.sh script and fill the details form example.run.sh file
./run.sh
```

- Run the client
```bash
cd ..
cd ui
pnpm install
pnpm dev
```

#### Summary 

<i>The provided code is a Node.js server built with the Fastify web framework, incorporating real-time communication with clients via websockets and using Redis as a message broker. </i>
<i>We are using Caddy as <b>Load Balancer</b>. The reverse_proxy directive in the Caddyfile is being used to distribute incoming requests evenly among the available instances of the chat application. The header_down directive can be used to set the Strict-Transport-Security header for added security. </i>

