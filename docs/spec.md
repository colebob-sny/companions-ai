Companions App Technical Specifications

Core features (MVP ONLY):
--One personality companion: predefined personality rules –emotions, attitude, opinions, response style, etc. 
--Text chat (messaging inside app): users can send and receive text messages with the AI in real time. 
--Long-term memory: key facts and information about the user, as well as key conversation details, as stored for future chats. 

Non-Goals (MVP ONLY):
--Voice: postponed until proper text chat feature is implemented.
--Call ability: postponed until proper text chat/ voice feature is implemented.
--Fancy UI: UI should stay simple until a very functional backend is achieved. 

Stack:
--Expo (React Native): simple frontend app for IOS and Android
--Node.js backend: handles chat requests, memory management, and AI implementation.
--PostgresSQL + Vector embeddings : stores long-term memory snippets
--OpenAI API: generates AI responses 


Directory Structure:
-- /app        -> Expo frontend
-- /server     -> Node.js backend, Postgres Database
-- /docs       -> specs, prompts, decisions
