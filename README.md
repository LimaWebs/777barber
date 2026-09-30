# 777 Barber

Sistema de agendamento e vitrine de cosméticos (Express + Turso/libSQL, front estático em `public/`).

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Para quê |
|---|---|
| `TURSO_URL` | URL do banco Turso |
| `TURSO_TOKEN` | Token do banco Turso |
| `AUTH_SECRET` | Texto longo e aleatório que assina os logins (obrigatório em produção) |
| `ADMIN_PASSWORD` | Senha do admin (usada só na criação do admin; o padrão é `admin123`, troque!) |

## Rodar local

```
npm install
TURSO_URL=file:local.db AUTH_SECRET=qualquercoisa npm start
```
Abra http://localhost:3000
