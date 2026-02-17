# Paz Church API - Postman Documentation

## Base Configuration

| Variable | Value |
|----------|-------|
| `{{base_url}}` | `http://localhost:3001/api` |
| `{{access_token}}` | JWT token obtained from the social login endpoint |

### Default Headers

All authenticated endpoints require:

```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

---

## 1. Authentication

### POST /auth/social-login

**Description**: Authenticate a user via social login (Google or Apple). No auth token required.

**Headers**:
- Content-Type: application/json

**Request Body**:
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "provider": "google"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id_token | string | Yes | The ID token from the social provider |
| provider | string | Yes | `"google"` or `"apple"` |

**Response** (200):
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://example.com/avatar.jpg"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

---

### POST /auth/refresh

**Description**: Refresh an expired access token. No auth token required.

**Headers**:
- Content-Type: application/json

**Request Body**:
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response** (200):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "bmV3IHJlZnJlc2ggdG9rZW4..."
}
```

---

### POST /auth/logout

**Description**: Log out the current user and invalidate the session.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Response** (204): No content

---

## 2. Announcements

### GET /announcements

**Description**: Retrieve all announcements.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
[
  {
    "id": 1,
    "image_url": "https://example.com/image.jpg",
    "title": "Culto Especial",
    "subtitle": "Venha participar do nosso culto especial",
    "markdown_content": "# Culto Especial\n\nDetalhes do evento...",
    "action_url": "https://example.com/event"
  }
]
```

---

### GET /announcements/:id

**Description**: Retrieve a single announcement by ID.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
{
  "id": 1,
  "image_url": "https://example.com/image.jpg",
  "title": "Culto Especial",
  "subtitle": "Venha participar do nosso culto especial",
  "markdown_content": "# Culto Especial\n\nDetalhes do evento...",
  "action_url": "https://example.com/event"
}
```

---

### POST /announcements

**Description**: Create a new announcement.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "image_url": "https://example.com/image.jpg",
  "title": "Novo Anuncio",
  "subtitle": "Subtitulo do anuncio",
  "markdown_content": "# Conteudo\n\nTexto em markdown...",
  "action_url": "https://example.com/action"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image_url | string | Yes | URL of the announcement image |
| title | string | Yes | Title of the announcement |
| subtitle | string | Yes | Short description |
| markdown_content | string | Yes | Full content in Markdown format |
| action_url | string | No | Optional CTA link |

**Response** (201):
```json
{
  "id": 2,
  "image_url": "https://example.com/image.jpg",
  "title": "Novo Anuncio",
  "subtitle": "Subtitulo do anuncio",
  "markdown_content": "# Conteudo\n\nTexto em markdown...",
  "action_url": "https://example.com/action"
}
```

---

### PUT /announcements/:id

**Description**: Update an existing announcement. All fields are optional.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "title": "Titulo Atualizado",
  "subtitle": "Novo subtitulo"
}
```

**Response** (200):
```json
{
  "id": 1,
  "image_url": "https://example.com/image.jpg",
  "title": "Titulo Atualizado",
  "subtitle": "Novo subtitulo",
  "markdown_content": "# Culto Especial\n\nDetalhes do evento...",
  "action_url": "https://example.com/event"
}
```

---

### DELETE /announcements/:id

**Description**: Delete an announcement.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (204): No content

---

## 3. Contributions

### GET /contributions

**Description**: Retrieve all contribution accounts (bank accounts for donations).

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
[
  {
    "id": 1,
    "bank_name": "Banco do Brasil",
    "branch_number": "1234",
    "account_number": "56789-0",
    "pix_key": "igreja@paz.com"
  }
]
```

---

### GET /contributions/:id

**Description**: Retrieve a single contribution account by ID.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
{
  "id": 1,
  "bank_name": "Banco do Brasil",
  "branch_number": "1234",
  "account_number": "56789-0",
  "pix_key": "igreja@paz.com"
}
```

---

### POST /contributions

**Description**: Create a new contribution account.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "bank_name": "Bradesco",
  "branch_number": "4321",
  "account_number": "98765-4",
  "pix_key": "41999999999"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| bank_name | string | Yes | Name of the bank |
| branch_number | string | Yes | Branch number |
| account_number | string | Yes | Account number |
| pix_key | string | Yes | PIX key for transfers |

**Response** (201):
```json
{
  "id": 2,
  "bank_name": "Bradesco",
  "branch_number": "4321",
  "account_number": "98765-4",
  "pix_key": "41999999999"
}
```

---

### PUT /contributions/:id

**Description**: Update an existing contribution account. All fields are optional.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "pix_key": "novaChave@pix.com"
}
```

**Response** (200):
```json
{
  "id": 1,
  "bank_name": "Banco do Brasil",
  "branch_number": "1234",
  "account_number": "56789-0",
  "pix_key": "novaChave@pix.com"
}
```

---

### DELETE /contributions/:id

**Description**: Delete a contribution account.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (204): No content

---

## 4. Events (Agenda)

### GET /events

**Description**: Retrieve all events. The API returns events grouped by month.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
[
  {
    "month": "Janeiro",
    "ano": "2024",
    "events": [
      {
        "id": 1,
        "title": "Culto Dominical",
        "description": "Culto de domingo pela manha",
        "initial_date": "2024-01-07T09:00:00Z",
        "final_date": "2024-01-07T12:00:00Z",
        "recurrence_type": "WEEKLY",
        "image": "https://example.com/culto.jpg",
        "church_id": 1,
        "address": {
          "street": "Rua da Igreja",
          "number": "100",
          "complement": "Sala 1",
          "reference": "Proximo ao mercado",
          "neighborhood": "Centro",
          "city": "Curitiba",
          "state": "PR",
          "zip_code": "80000-000",
          "country": "Brasil"
        }
      }
    ]
  }
]
```

---

### GET /events/:id

**Description**: Retrieve a single event by ID.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
{
  "id": 1,
  "title": "Culto Dominical",
  "description": "Culto de domingo pela manha",
  "initial_date": "2024-01-07T09:00:00Z",
  "final_date": "2024-01-07T12:00:00Z",
  "recurrence_type": "WEEKLY",
  "image": "https://example.com/culto.jpg",
  "church_id": 1,
  "address": {
    "street": "Rua da Igreja",
    "number": "100",
    "complement": null,
    "reference": null,
    "neighborhood": "Centro",
    "city": "Curitiba",
    "state": "PR",
    "zip_code": "80000-000",
    "country": "Brasil"
  }
}
```

---

### POST /events

**Description**: Create a new event.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "title": "Retiro de Jovens",
  "description": "Retiro anual de jovens da igreja",
  "initial_date": "2024-03-15T08:00:00Z",
  "final_date": "2024-03-17T18:00:00Z",
  "recurrence_type": null,
  "image": "https://example.com/retiro.jpg",
  "address": {
    "street": "Estrada Rural",
    "number": "500",
    "complement": "Sitio Paz",
    "reference": "Km 10",
    "neighborhood": "Zona Rural",
    "city": "Campo Largo",
    "state": "PR",
    "zip_code": "83600-000",
    "country": "Brasil"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Event title |
| description | string | No | Event description |
| initial_date | string (ISO) | Yes | Start date/time |
| final_date | string (ISO) | No | End date/time |
| recurrence_type | string/null | No | `"WEEKLY"`, `"MONTHLY"`, or `null` |
| image | string | No | Image URL |
| address | object | No | Event location (see Address object) |

**Response** (201):
```json
{
  "id": 5,
  "title": "Retiro de Jovens",
  "description": "Retiro anual de jovens da igreja",
  "initial_date": "2024-03-15T08:00:00Z",
  "final_date": "2024-03-17T18:00:00Z",
  "recurrence_type": null,
  "image": "https://example.com/retiro.jpg",
  "church_id": 1,
  "address": {
    "street": "Estrada Rural",
    "number": "500",
    "complement": "Sitio Paz",
    "reference": "Km 10",
    "neighborhood": "Zona Rural",
    "city": "Campo Largo",
    "state": "PR",
    "zip_code": "83600-000",
    "country": "Brasil"
  }
}
```

---

### PUT /events/:id

**Description**: Update an existing event. All fields are optional.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "title": "Retiro de Jovens 2024",
  "description": "Atualizado: Retiro anual"
}
```

**Response** (200): Updated event object (same structure as GET)

---

### DELETE /events/:id

**Description**: Delete an event.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (204): No content

---

## 5. Courses

### GET /courses

**Description**: Retrieve all courses. Response may be wrapped in `{ data: [...] }` or a raw array.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
[
  {
    "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "title": "Fundamentos da Fe",
    "description": "Curso basico de teologia",
    "creator": "Pastor Carlos",
    "creator_id": "user-123",
    "estimated_hours": 12,
    "category": "teologia",
    "url": "https://example.com/course/1",
    "image_url": "https://example.com/course-image.jpg",
    "thumbnail_url": "https://example.com/course-thumb.jpg",
    "status": "published",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z"
  }
]
```

---

### GET /courses/:id

**Description**: Retrieve a single course by ID.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
{
  "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "title": "Fundamentos da Fe",
  "description": "Curso basico de teologia",
  "creator": "Pastor Carlos",
  "creator_id": "user-123",
  "estimated_hours": 12,
  "category": "teologia",
  "url": "https://example.com/course/1",
  "image_url": "https://example.com/course-image.jpg",
  "thumbnail_url": "https://example.com/course-thumb.jpg",
  "status": "published",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T00:00:00Z"
}
```

---

### POST /courses

**Description**: Create a new course.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "title": "Lideranca Crista",
  "description": "Aprenda principios de lideranca biblica",
  "creator": "Pastor Ana",
  "creator_id": "user-456",
  "estimated_hours": 8,
  "category": "lideranca",
  "url": "https://example.com/course/new",
  "image_url": "https://example.com/new-course.jpg",
  "thumbnail_url": "https://example.com/new-course-thumb.jpg",
  "status": "draft"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Course title |
| description | string | Yes | Course description |
| creator | string | Yes | Creator name |
| creator_id | string | No | Creator user ID |
| estimated_hours | number | Yes | Estimated duration in hours |
| category | string | Yes | `"teologia"`, `"lideranca"`, `"ministerio"`, or `"discipulado"` |
| url | string/null | No | Course URL |
| image_url | string/null | No | Cover image URL |
| thumbnail_url | string/null | No | Thumbnail URL |
| status | string | No | `"draft"`, `"published"`, or `"archived"` (defaults to `"draft"`) |

**Response** (201): Created course object

---

### PUT /courses/:id

**Description**: Update an existing course. All fields are optional.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "status": "published",
  "estimated_hours": 10
}
```

**Response** (200): Updated course object

---

### DELETE /courses/:id

**Description**: Delete a course.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (204): No content

---

## 6. Home

### GET /home

**Description**: Retrieve the home screen data (currently returns announcements for the app).

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
{
  "announcements": [
    {
      "id": 1,
      "image_url": "https://example.com/image.jpg",
      "title": "Culto Especial",
      "subtitle": "Venha participar",
      "markdown_content": "# Conteudo...",
      "action_url": "https://example.com"
    }
  ]
}
```

---

## 7. Academy

### GET /academy

**Description**: Retrieve the academy data with course tracks.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
{
  "tracks": [
    {
      "id": 1,
      "title": "Trilha de Teologia",
      "description": "Cursos de fundamentos teologicos",
      "courses": [
        {
          "id": 1,
          "title": "Introducao a Biblia",
          "description": "Curso introdutorio",
          "thumbnail_url": "https://example.com/thumb.jpg"
        }
      ]
    }
  ]
}
```

---

## 8. Notifications

### GET /notifications

**Description**: Retrieve all notifications.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
[
  {
    "id": 1,
    "title": "Lembrete de Culto",
    "message": "Nao esqueca do culto de amanha as 9h",
    "channels": ["push", "email"],
    "target_audience": "all",
    "recipients": 856,
    "status": "sent",
    "sent_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### GET /notifications/:id

**Description**: Retrieve a single notification by ID.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
{
  "id": 1,
  "title": "Lembrete de Culto",
  "message": "Nao esqueca do culto de amanha as 9h",
  "channels": ["push", "email"],
  "target_audience": "all",
  "recipients": 856,
  "status": "sent",
  "sent_at": "2024-01-15T10:00:00Z"
}
```

---

### POST /notifications

**Description**: Send a new notification.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "title": "Evento Especial",
  "message": "Voce esta convidado para o evento especial neste sabado",
  "channels": ["push", "whatsapp"],
  "target_audience": "active"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Notification title |
| message | string | Yes | Notification message body |
| channels | string[] | Yes | Delivery channels: `"email"`, `"sms"`, `"whatsapp"`, `"push"` |
| target_audience | string | Yes | Target: `"all"`, `"active"`, `"youth"`, `"adults"`, `"leaders"` |

**Response** (201):
```json
{
  "id": 2,
  "title": "Evento Especial",
  "message": "Voce esta convidado para o evento especial neste sabado",
  "channels": ["push", "whatsapp"],
  "target_audience": "active",
  "recipients": 650,
  "status": "pending",
  "sent_at": "2024-01-16T14:00:00Z"
}
```

---

### DELETE /notifications/:id

**Description**: Delete a notification from history.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (204): No content

---

## 9. Users

### GET /users

**Description**: Retrieve all admin users.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Joao Silva",
    "email": "joao@igreja.com",
    "role": "admin",
    "status": "active",
    "avatar": "https://example.com/avatar.jpg",
    "created_at": "2023-06-01T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z"
  },
  {
    "id": 2,
    "name": "Maria Santos",
    "email": "maria@igreja.com",
    "role": "moderator",
    "status": "active",
    "avatar": null,
    "created_at": "2023-07-15T00:00:00Z",
    "updated_at": "2024-01-10T00:00:00Z"
  }
]
```

---

### GET /users/:id

**Description**: Retrieve a single user by ID.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
{
  "id": 1,
  "name": "Joao Silva",
  "email": "joao@igreja.com",
  "role": "admin",
  "status": "active",
  "avatar": "https://example.com/avatar.jpg",
  "created_at": "2023-06-01T00:00:00Z",
  "updated_at": "2024-01-15T00:00:00Z"
}
```

---

### POST /users

**Description**: Create a new user.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "name": "Pedro Costa",
  "email": "pedro@igreja.com",
  "role": "user"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | User's full name |
| email | string | Yes | User's email address |
| role | string | Yes | `"admin"`, `"moderator"`, or `"user"` |

**Response** (201):
```json
{
  "id": 3,
  "name": "Pedro Costa",
  "email": "pedro@igreja.com",
  "role": "user",
  "status": "active",
  "avatar": null,
  "created_at": "2024-01-16T00:00:00Z",
  "updated_at": "2024-01-16T00:00:00Z"
}
```

---

### PUT /users/:id

**Description**: Update an existing user. All fields are optional.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "name": "Pedro Costa Junior",
  "role": "moderator",
  "status": "inactive"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | Updated name |
| email | string | No | Updated email |
| role | string | No | `"admin"`, `"moderator"`, or `"user"` |
| status | string | No | `"active"` or `"inactive"` |
| avatar | string | No | Avatar URL |

**Response** (200):
```json
{
  "id": 3,
  "name": "Pedro Costa Junior",
  "email": "pedro@igreja.com",
  "role": "moderator",
  "status": "inactive",
  "avatar": null,
  "created_at": "2024-01-16T00:00:00Z",
  "updated_at": "2024-01-17T00:00:00Z"
}
```

---

### DELETE /users/:id

**Description**: Delete a user from the system.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (204): No content

---

## 10. Members

### GET /members

**Description**: Retrieve all church members.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Carlos Mendes",
    "email": "carlos@email.com",
    "phone": "(41) 99999-9999",
    "address": "Rua das Flores, 123",
    "birth_date": "1985-03-15",
    "life_group": "Jovens Unidos",
    "status": "active",
    "membership_date": "2020-01-10",
    "created_at": "2020-01-10T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z"
  },
  {
    "id": 2,
    "name": "Fernanda Lima",
    "email": "fernanda@email.com",
    "phone": "(41) 88888-8888",
    "address": "Av. Principal, 456",
    "birth_date": "1990-07-22",
    "life_group": "Mulheres de Fe",
    "status": "active",
    "membership_date": "2021-05-15",
    "created_at": "2021-05-15T00:00:00Z",
    "updated_at": "2024-01-10T00:00:00Z"
  }
]
```

---

### GET /members/:id

**Description**: Retrieve a single member by ID.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
{
  "id": 1,
  "name": "Carlos Mendes",
  "email": "carlos@email.com",
  "phone": "(41) 99999-9999",
  "address": "Rua das Flores, 123",
  "birth_date": "1985-03-15",
  "life_group": "Jovens Unidos",
  "status": "active",
  "membership_date": "2020-01-10",
  "created_at": "2020-01-10T00:00:00Z",
  "updated_at": "2024-01-15T00:00:00Z"
}
```

---

### POST /members

**Description**: Add a new church member.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "name": "Ana Oliveira",
  "email": "ana@email.com",
  "phone": "(41) 77777-7777",
  "address": "Rua da Paz, 789",
  "birth_date": "1992-11-20",
  "life_group": "Familia Abencoada"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Member's full name |
| email | string | Yes | Member's email address |
| phone | string | Yes | Phone number |
| address | string | No | Full address |
| birth_date | string | Yes | Date of birth (YYYY-MM-DD) |
| life_group | string | No | Name of the life group |

**Response** (201):
```json
{
  "id": 5,
  "name": "Ana Oliveira",
  "email": "ana@email.com",
  "phone": "(41) 77777-7777",
  "address": "Rua da Paz, 789",
  "birth_date": "1992-11-20",
  "life_group": "Familia Abencoada",
  "status": "active",
  "membership_date": "2024-01-16",
  "created_at": "2024-01-16T00:00:00Z",
  "updated_at": "2024-01-16T00:00:00Z"
}
```

---

### PUT /members/:id

**Description**: Update an existing member. All fields are optional.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "phone": "(41) 66666-6666",
  "life_group": "Jovens Unidos",
  "status": "inactive"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | Updated name |
| email | string | No | Updated email |
| phone | string | No | Updated phone |
| address | string | No | Updated address |
| birth_date | string | No | Updated birth date |
| life_group | string | No | Updated life group |
| status | string | No | `"active"` or `"inactive"` |

**Response** (200):
```json
{
  "id": 1,
  "name": "Carlos Mendes",
  "email": "carlos@email.com",
  "phone": "(41) 66666-6666",
  "address": "Rua das Flores, 123",
  "birth_date": "1985-03-15",
  "life_group": "Jovens Unidos",
  "status": "inactive",
  "membership_date": "2020-01-10",
  "created_at": "2020-01-10T00:00:00Z",
  "updated_at": "2024-01-17T00:00:00Z"
}
```

---

### DELETE /members/:id

**Description**: Delete a member from the system.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (204): No content

---

## 11. Dashboard

### GET /admin/dashboard

**Description**: Retrieve all dashboard data at once (stats, trends, growth, life group distribution).

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
{
  "stats": {
    "total_members": 1234,
    "active_members": 856,
    "total_life_groups": 24,
    "events_this_month": 12,
    "new_members_this_month": 18,
    "contributions_this_month": 45000.00
  },
  "access_trends": [
    { "date": "Jan", "access_count": 1200 },
    { "date": "Fev", "access_count": 1400 },
    { "date": "Mar", "access_count": 1100 }
  ],
  "member_growth": [
    { "month": "Jan", "new_members": 15, "total_members": 780 },
    { "month": "Fev", "new_members": 18, "total_members": 798 },
    { "month": "Mar", "new_members": 14, "total_members": 812 }
  ],
  "life_group_distribution": [
    { "name": "Jovens", "member_count": 120 },
    { "name": "Adultos", "member_count": 350 },
    { "name": "Idosos", "member_count": 80 },
    { "name": "Criancas", "member_count": 45 }
  ]
}
```

---

### GET /dashboard/stats

**Description**: Retrieve only the summary statistics for the dashboard.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
{
  "total_members": 1234,
  "active_members": 856,
  "total_life_groups": 24,
  "events_this_month": 12,
  "new_members_this_month": 18,
  "contributions_this_month": 45000.00
}
```

---

### GET /dashboard/access-trends

**Description**: Retrieve access trend data for charts.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
[
  { "date": "Jan", "access_count": 1200 },
  { "date": "Fev", "access_count": 1400 },
  { "date": "Mar", "access_count": 1100 },
  { "date": "Abr", "access_count": 1600 },
  { "date": "Mai", "access_count": 1800 },
  { "date": "Jun", "access_count": 2100 },
  { "date": "Jul", "access_count": 2400 }
]
```

---

### GET /dashboard/member-growth

**Description**: Retrieve member growth data over time.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
[
  { "month": "Jan", "new_members": 15, "total_members": 780 },
  { "month": "Fev", "new_members": 18, "total_members": 798 },
  { "month": "Mar", "new_members": 14, "total_members": 812 },
  { "month": "Abr", "new_members": 13, "total_members": 825 },
  { "month": "Mai", "new_members": 16, "total_members": 841 },
  { "month": "Jun", "new_members": 15, "total_members": 856 }
]
```

---

### GET /dashboard/life-groups-distribution

**Description**: Retrieve life group distribution data for charts.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
[
  { "name": "Jovens", "member_count": 120 },
  { "name": "Adultos", "member_count": 350 },
  { "name": "Idosos", "member_count": 80 },
  { "name": "Criancas", "member_count": 45 }
]
```

---

## 12. Church

### GET /church

**Description**: Retrieve the church data.

**Headers**:
- Authorization: Bearer {{access_token}}

**Response** (200):
```json
{
  "id": 1,
  "name": "Igreja Evangelica Paz",
  "description": "Uma igreja comprometida com o amor de Deus",
  "address": {
    "street": "Rua da Igreja",
    "number": "123",
    "complement": null,
    "reference": null,
    "neighborhood": "Centro",
    "city": "Curitiba",
    "state": "PR",
    "zip_code": "80000-000",
    "country": "Brasil"
  },
  "contact": {
    "phone": "(41) 3456-7890",
    "email": "contato@paz.com",
    "website": "www.paz.com"
  },
  "schedule": {
    "sunday": { "morning": "10:00", "evening": "19:00" },
    "wednesday": { "evening": "19:30" },
    "friday": { "evening": "19:30" },
    "saturday": { "evening": "19:00" }
  },
  "social_media": {
    "facebook": "facebook.com/paz",
    "instagram": "@paz",
    "youtube": "youtube.com/paz",
    "twitter": "@paz"
  },
  "updated_at": "2024-01-15T00:00:00Z"
}
```

---

### PUT /church

**Description**: Update church data. All fields are optional.

**Headers**:
- Authorization: Bearer {{access_token}}
- Content-Type: application/json

**Request Body**:
```json
{
  "name": "Igreja Evangelica Paz",
  "description": "Uma igreja comprometida com o amor de Deus",
  "address": {
    "street": "Rua da Igreja",
    "number": "123",
    "complement": null,
    "reference": null,
    "neighborhood": "Centro",
    "city": "Curitiba",
    "state": "PR",
    "zip_code": "80000-000",
    "country": "Brasil"
  },
  "contact": {
    "phone": "(41) 3456-7890",
    "email": "contato@paz.com",
    "website": "www.paz.com"
  },
  "schedule": {
    "sunday": { "morning": "10:00", "evening": "19:00" },
    "wednesday": { "evening": "19:30" },
    "friday": { "evening": "19:30" },
    "saturday": { "evening": "19:00" }
  },
  "social_media": {
    "facebook": "facebook.com/paz",
    "instagram": "@paz",
    "youtube": "youtube.com/paz",
    "twitter": "@paz"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | Church name |
| description | string/null | No | Church description |
| address | object | No | Full address object (all sub-fields optional) |
| contact | object | No | Contact info (all sub-fields optional) |
| schedule | object | No | Service schedule (all day sub-fields optional) |
| social_media | object | No | Social media links (all sub-fields optional) |

**Response** (200): Updated church object (same structure as GET)

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

## Postman Environment Setup

1. Create a new environment in Postman
2. Add the following variables:

| Variable | Initial Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:3001/api` | API base URL |
| `access_token` | (empty) | Auto-set by Tests scripts after login/refresh |
| `refresh_token` | (empty) | Auto-set by Tests scripts after login/refresh |
| `user_id` | (empty) | Auto-set after login |
| `user_email` | (empty) | Auto-set after login |
| `user_name` | (empty) | Auto-set after login |

3. For the `Authorization` header on all authenticated requests, use: `Bearer {{access_token}}`

---

## Postman Test Scripts (Post-Response)

These scripts go in the **Tests** tab (also called "Post-response" in newer Postman versions) of each request. They run automatically after the response is received, validate the response, and persist tokens so every subsequent request in the collection can use them.

### POST /auth/social-login -- Tests script

Paste this into the **Tests** tab of the `POST {{base_url}}/auth/social-login` request:

```javascript
// -- POST /auth/social-login -- Tests (post-response) script --

pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has access_token", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("access_token");
    pm.expect(json.access_token).to.be.a("string").and.not.be.empty;
});

pm.test("Response has refresh_token", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("refresh_token");
    pm.expect(json.refresh_token).to.be.a("string").and.not.be.empty;
});

pm.test("Response has user object", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("user");
    pm.expect(json.user).to.have.property("id");
    pm.expect(json.user).to.have.property("email");
});

// -- Store tokens as environment variables for reuse across the collection --
const response = pm.response.json();

pm.environment.set("access_token", response.access_token);
pm.environment.set("refresh_token", response.refresh_token);

// -- Store user info (optional, but useful for debugging and parameterised requests) --
if (response.user) {
    pm.environment.set("user_id", response.user.id);
    pm.environment.set("user_email", response.user.email);
    pm.environment.set("user_name", response.user.name || "");
}

console.log("Tokens stored. access_token: " + response.access_token.substring(0, 20) + "...");
```

### POST /auth/refresh -- Tests script

Paste this into the **Tests** tab of the `POST {{base_url}}/auth/refresh` request:

```javascript
// -- POST /auth/refresh -- Tests (post-response) script --

pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has new access_token", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("access_token");
    pm.expect(json.access_token).to.be.a("string").and.not.be.empty;
});

pm.test("Response has new refresh_token", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("refresh_token");
    pm.expect(json.refresh_token).to.be.a("string").and.not.be.empty;
});

// -- Overwrite stored tokens so the rest of the collection uses the fresh ones --
const response = pm.response.json();

pm.environment.set("access_token", response.access_token);
pm.environment.set("refresh_token", response.refresh_token);

console.log("Tokens refreshed. New access_token: " + response.access_token.substring(0, 20) + "...");
```

### Using the stored tokens in other requests

Once you have run `POST /auth/social-login` (or `POST /auth/refresh`), the `access_token` and `refresh_token` environment variables are populated automatically. To authenticate any other request in the collection:

**Option A -- Authorization header (recommended)**

In the request's **Headers** tab, add:

| Key | Value |
|-----|-------|
| `Authorization` | `Bearer {{access_token}}` |

**Option B -- Postman Authorization tab**

1. Open the request (or the collection root to apply it to all requests).
2. Go to the **Authorization** tab.
3. Select **Type**: `Bearer Token`.
4. Set **Token** to: `{{access_token}}`.

Either option resolves the variable at send-time using the value stored by the Tests script.

### (Optional) Collection-level Pre-request Script for auto-refresh

If you want every request to silently refresh an expired token before it fires, add this as a **Pre-request Script** at the **collection** level:

```javascript
// -- Collection-level Pre-request Script -- Auto-refresh expired tokens --

const accessToken = pm.environment.get("access_token");

// Only attempt refresh if we have a refresh_token but no access_token,
// or if the access_token JWT is expired.
let needsRefresh = !accessToken;

if (accessToken && !needsRefresh) {
    try {
        // Decode the JWT payload (middle segment) to check expiry
        const payload = JSON.parse(atob(accessToken.split(".")[1]));
        const nowInSeconds = Math.floor(Date.now() / 1000);
        // Refresh 60 seconds before actual expiry to avoid race conditions
        needsRefresh = payload.exp && (payload.exp - 60) < nowInSeconds;
    } catch (e) {
        // If decoding fails, let the request proceed as-is
        needsRefresh = false;
    }
}

if (needsRefresh) {
    const refreshToken = pm.environment.get("refresh_token");
    if (refreshToken) {
        pm.sendRequest({
            url: pm.environment.get("base_url") + "/auth/refresh",
            method: "POST",
            header: { "Content-Type": "application/json" },
            body: {
                mode: "raw",
                raw: JSON.stringify({ refresh_token: refreshToken })
            }
        }, function (err, res) {
            if (!err && res.code === 200) {
                const data = res.json();
                pm.environment.set("access_token", data.access_token);
                pm.environment.set("refresh_token", data.refresh_token);
                console.log("Auto-refreshed tokens via pre-request script.");
            } else {
                console.log("Auto-refresh failed. You may need to re-login via /auth/social-login.");
            }
        });
    }
}
```

### Quick-start workflow

1. **Import the collection** and create the environment with the variables listed above.
2. **Send `POST /auth/social-login`** with a valid `id_token` and `provider`. The Tests script stores the tokens automatically.
3. **Send any authenticated request** -- the `{{access_token}}` variable is already populated.
4. **When the token expires**, either call `POST /auth/refresh` manually, or rely on the collection-level pre-request script to handle it for you.
