import dotenv from "dotenv";
import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyIO from "fastify-socket.io";
import Redis from "ioredis";
import closeWithGrace from "close-with-grace";
import { randomUUID } from "crypto";
dotenv.config()

const PORT = parseInt(process.env.PORT || "3001",10);
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const UPSTASH_REDIS_REST_URL =  process.env.UPSTASH_REDIS_REST_URL;

const CONNECTION_COUNT_KEY = "chat:connection-count";
const CONNECTION_COUNT_UPDATED_CHANNEL ="chat:connection-count-updated"
const NEW_MESSAGE_CHANNEL = "chat:new-message";
const MESSAGES_KEY ="chat:messages";


if(!UPSTASH_REDIS_REST_URL){
    console.error("missing UPSTASH_REDIS_REST_URL");
    process.exit(1);
}
const publisher = new Redis(UPSTASH_REDIS_REST_URL);
const subscriber = new Redis(UPSTASH_REDIS_REST_URL)

let connectedClients = 0

async function server(){
    const app = fastify();

    await app.register(fastifyCors,{
        origin:CORS_ORIGIN,
    });
    
    await app.register(fastifyIO);  

    const currentCount = await publisher.get(CONNECTION_COUNT_KEY);

    if(!currentCount){
        await publisher.set(CONNECTION_COUNT_KEY,0);
    }

    app.io.on("connection", async(io)=>{
        console.log('client connected');
        const incCount= await publisher.incr(CONNECTION_COUNT_KEY);
        connectedClients++
        await publisher.publish(CONNECTION_COUNT_UPDATED_CHANNEL,String(incCount));  //we can't publish a number, so that is why we are typecasting newCount to string
        
        io.on(NEW_MESSAGE_CHANNEL,async (payload) => {
            const message = payload.message;
            if(!message){
                return;
            }
            console.log("rest", message);
            await publisher.publish(NEW_MESSAGE_CHANNEL, message.toString());
        })

        io.on('disconnect', async()=>{
            console.log('client disconnected');
            connectedClients--
            const decCount= await publisher.decr(CONNECTION_COUNT_KEY);
            await publisher.publish(CONNECTION_COUNT_UPDATED_CHANNEL,String(decCount));
        })
    })

   subscriber.subscribe(CONNECTION_COUNT_UPDATED_CHANNEL, (err,count)=>{
    if(err){
        console.error(
            `Error subscribing to ${CONNECTION_COUNT_UPDATED_CHANNEL} channel`
        );
        return;
    }
    console.log(
        `${count} clients connected to the ${CONNECTION_COUNT_UPDATED_CHANNEL} channel`
    );
    });

    subscriber.subscribe(NEW_MESSAGE_CHANNEL, (err, count)=>{
        if(err){
            console.error(
                `Error subscribing to ${NEW_MESSAGE_CHANNEL} channel`
            );
            return;
        }
        console.log(
            `${count} clients subscribes to ${NEW_MESSAGE_CHANNEL} channel`
        );   
    })

    subscriber.on("message",(channel, text)=>{
        if(channel===CONNECTION_COUNT_UPDATED_CHANNEL){
            app.io.emit(CONNECTION_COUNT_UPDATED_CHANNEL,{
                count:text,
            })
            return;
        }

        if(channel=== NEW_MESSAGE_CHANNEL){
            app.io.emit(NEW_MESSAGE_CHANNEL,{
                message:text,
                id: randomUUID(),
                createdAt: new Date(),
                port: PORT,
            });
        }
    });

    app.get("/healthcheck",()=>{
        return{
            status:"ok",
            port:PORT,
        };
    });

    return app;
}

async function main() {
    const app = await server();

    try{
        await app.listen({
            port:PORT,
            host:HOST,
        });

        closeWithGrace({delay:2000}, async({signal,err})=>{
            console.log("Shutting");
            console.log({err, signal});
            
            if(connectedClients>0){
                console.log(`removing ${connectedClients} from the count`);
                const currentCount = parseInt(
                    (await publisher.get(CONNECTION_COUNT_KEY))|| "0", 10
                );

                const newCount = Math.max(currentCount- connectedClients,0);
                await publisher.set(CONNECTION_COUNT_KEY, newCount);
            }
            await app.close();
            console.log("shutdown complete")
        });

        console.log(`Server started at http://${HOST}:${PORT}`);
    }catch(e){
        console.error(e);
        process.exit(1);
    }
}

main();