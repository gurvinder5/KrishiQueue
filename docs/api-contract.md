# KrishiQueue API Contract (For Frontend & Maker 2 Integration)

All APIs follow the standard Next.js App Router route handler convention (`/api/*`) and return JSON responses wrapped in a uniform envelope.

---

## Standard Envelope Formats

### 1. Success Envelope
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
```

### 2. Error Envelope
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;       // e.g. "SLOT_CAPACITY_EXCEEDED", "UNAUTHORIZED", "VALIDATION_ERROR"
    message: string;    // Human-readable error message
    details?: any;      // Validation issue array or debugging context
  };
}
```

---

## Authentication Header
Protected endpoints require:
```http
Authorization: Bearer <JWT_TOKEN>
```
Or an HttpOnly cookie named `krishi_session`.

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Register a new Farmer, Operator, or Administrator.
- **Access**: Public
- **Request Body**:
```json
{
  "phone": "9876543210",
  "name": "Ramesh Kumar",
  "password": "SecurePassword123!",
  "role": "FARMER", // "FARMER" | "CENTER_OPERATOR" | "ADMIN"
  "email": "ramesh@example.com", // Optional
  // If role is FARMER:
  "farmerDetails": {
    "farmerIdNumber": "PMK-987654",
    "state": "Punjab",
    "district": "Ludhiana",
    "village": "Khanna",
    "pincode": "141401",
    "bankAccountNo": "123456789012",
    "bankIfsc": "SBIN0001234",
    "bankName": "State Bank of India"
  }
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "uuid-...",
      "name": "Ramesh Kumar",
      "phone": "9876543210",
      "role": "FARMER",
      "farmerProfile": { "id": "uuid-...", "farmerIdNumber": "PMK-987654" }
    }
  }
}
```

### `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "phone": "9876543210",
  "password": "SecurePassword123!"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "uuid-...",
      "name": "Ramesh Kumar",
      "phone": "9876543210",
      "role": "FARMER"
    }
  }
}
```

### `GET /api/auth/me`
- **Access**: Authenticated (`FARMER`, `CENTER_OPERATOR`, `ADMIN`)
- **Response `200 OK`**: Returns current user profile with role context.

---

## 2. Procurement Centers Endpoints

### `GET /api/centers`
List all procurement centers with optional filtering.
- **Query Params**: `?state=Punjab&district=Ludhiana&cropId=uuid&search=Khanna`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-center-1",
      "code": "PB-LUD-001",
      "name": "Khanna Grain Market APMC",
      "district": "Ludhiana",
      "state": "Punjab",
      "address": "GT Road, Khanna",
      "dailyCapacityQuintals": 5000,
      "acceptedCrops": [
        { "id": "uuid-crop-1", "name": "Wheat (Sharbati)", "mspRate": 2275.00 }
      ]
    }
  ]
}
```

### `GET /api/centers/:id`
Get full details of a specific procurement center.

---

## 3. Crops & MSP Endpoints

### `GET /api/crops`
List all active crops and government MSP rates.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-crop-1",
      "code": "WHEAT",
      "name": "Wheat (Sharbati)",
      "category": "CEREALS",
      "mspRatePerQuintal": 2275.00,
      "moistureLimitPercent": 12.0
    }
  ]
}
```

---

## 4. Slots & Availability Endpoints

### `GET /api/slots`
Query slot availability for a center on a specific date.
- **Query Params**: `?centerId=uuid-center-1&date=2026-10-15`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-slot-1",
      "date": "2026-10-15",
      "startTime": "09:00",
      "endTime": "10:00",
      "capacity": 10,
      "bookedCount": 4,
      "availableSlots": 6,
      "status": "OPEN" // "OPEN" | "FULL"
    }
  ]
}
```

---

## 5. Bookings Endpoints

### `POST /api/bookings`
Create a concurrency-safe slot booking.
- **Access**: `FARMER` (or `CENTER_OPERATOR`/`ADMIN` on behalf of farmer)
- **Request Body**:
```json
{
  "slotId": "uuid-slot-1",
  "cropId": "uuid-crop-1",
  "estimatedQuantityQuintals": 45.5,
  "vehicleType": "TRACTOR_TROLLEY",
  "vehicleNumber": "PB-10-AB-1234",
  "driverName": "Gurdev Singh",
  "driverPhone": "9812345678"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-booking-1",
    "bookingReference": "BK-20261015-0042",
    "status": "CONFIRMED",
    "slot": {
      "date": "2026-10-15",
      "startTime": "09:00",
      "endTime": "10:00"
    },
    "center": {
      "name": "Khanna Grain Market APMC"
    },
    "token": {
      "tokenNumber": 42,
      "tokenDisplay": "TK-042",
      "status": "WAITING"
    }
  }
}
```
- **Error `409 Conflict` (If slot filled concurrently)**:
```json
{
  "success": false,
  "error": {
    "code": "SLOT_CAPACITY_EXCEEDED",
    "message": "The selected time slot has reached full capacity. Please choose another slot."
  }
}
```

### `GET /api/bookings`
List farmer's bookings or center's bookings based on role.
- **Query Params**: `?status=CONFIRMED&date=2026-10-15&page=1&limit=20`

### `POST /api/bookings/:id/cancel`
Cancel an existing booking and atomically release the slot capacity.
- **Access**: `FARMER` (Owner) or `ADMIN`
- **Request Body**:
```json
{
  "reason": "Vehicle breakdown"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-booking-1",
    "status": "CANCELLED"
  }
}
```

---

## 6. Digital Queue & Live Token Management

### `GET /api/queue/live`
Get live token queue status for a center.
- **Query Params**: `?centerId=uuid-center-1&date=2026-10-15`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "centerId": "uuid-center-1",
    "date": "2026-10-15",
    "currentlyServing": {
      "tokenDisplay": "TK-021",
      "farmerName": "Jasbir Singh",
      "cropName": "Wheat",
      "counterNumber": "Gate-2",
      "status": "AT_WEIGHBRIDGE"
    },
    "nextInQueue": [
      { "tokenDisplay": "TK-022", "estimatedWaitMinutes": 10 },
      { "tokenDisplay": "TK-023", "estimatedWaitMinutes": 25 }
    ],
    "totalWaiting": 8,
    "totalCompletedToday": 20
  }
}
```

### `POST /api/queue/call-next`
Operator action to call the next waiting token.
- **Access**: `CENTER_OPERATOR`, `ADMIN`
- **Request Body**:
```json
{
  "centerId": "uuid-center-1",
  "counterNumber": "Gate-1"
}
```

### `POST /api/queue/:tokenId/status`
Update token status (`AT_GATE`, `IN_QUALITY_CHECK`, `AT_WEIGHBRIDGE`, `UNLOADING`, `COMPLETED`, `SKIPPED`).

---

## 7. Procurement Workflow & Receipts

### `POST /api/procurement/records`
Create / finalize procurement weighing & quality inspection record.
- **Access**: `CENTER_OPERATOR`, `ADMIN`
- **Request Body**:
```json
{
  "bookingId": "uuid-booking-1",
  "grossWeightKg": 5200,
  "tareWeightKg": 1200,
  "moisturePercent": 11.4,
  "foreignMatterPercent": 0.8,
  "qualityGrade": "GRADE_A",
  "ratePerQuintal": 2275.00,
  "notes": "Quality standard compliant"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "receiptNumber": "RCP-2026-0042",
    "netWeightKg": 4000,
    "netWeightQuintals": 40.0,
    "totalAmount": 91000.00,
    "paymentStatus": "PENDING_CLEARANCE",
    "qualityGrade": "GRADE_A"
  }
}
```

---

## 8. Analytics & Dashboard Data

### `GET /api/analytics/center-summary`
- **Access**: `CENTER_OPERATOR`, `ADMIN`
- **Query Params**: `?centerId=uuid-center-1&range=today`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "totalBookings": 60,
    "completedProcurements": 48,
    "cancelledBookings": 3,
    "totalQuantityProcuredQuintals": 2150.5,
    "totalDisbursedAmount": 4892387.50,
    "averageWaitTimeMinutes": 24,
    "peakHourSlot": "10:00 - 11:00"
  }
}
```

---

## 9. Notifications

### `GET /api/notifications`
- **Access**: Authenticated
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-notif-1",
      "title": "Your Token is Called",
      "message": "Token TK-022 has been called to Gate-1.",
      "type": "QUEUE_CALL",
      "isRead": false,
      "createdAt": "2026-10-15T09:45:00Z"
    }
  ]
}
```
