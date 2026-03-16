import { DataAdapter } from './data-adapter';
import { Order, SchoolRunGroup, ExceptionOrder, DashboardStats, DeliveryType, AnalyticsData, OrderStatus } from './types';
import { EventLogger } from './event-logger';
import { getAnalyticsSummary } from './analytics-mock';

// Generate timestamps relative to now
function hoursAgo(hours: number): string {
    const date = new Date();
    date.setHours(date.getHours() - hours);
    return date.toISOString();
}

// Helper to generate large sets of mock data
const generateAdditionalOrders = (): Order[] => {
    const schools = [
        {
            code: 'STMARY', name: "St Mary's College", products: [
                { name: 'Polo Shirt', sku: 'POLO-NVY', price: 45 },
                { name: 'Dress', sku: 'DRESS-NVY', price: 65 },
                { name: 'Cardigan', sku: 'CARD-NVY', price: 55 },
                { name: 'Sports Short', sku: 'SPORT-NVY', price: 35 }
            ]
        },
        {
            code: 'STPETER', name: "St Peter's Primary", products: [
                { name: 'Polo Shirt', sku: 'POLO-WHT', price: 45 },
                { name: 'Jacket', sku: 'JACKET-NVY', price: 75 },
                { name: 'Hat', sku: 'HAT-NVY', price: 25, noEmbroidery: true }
            ]
        },
        {
            code: 'GREENWD', name: "Greenwood High", products: [
                { name: 'Blazer', sku: 'BLZ-GRN', price: 120 },
                { name: 'Shirt', sku: 'SHIRT-WHT', price: 40 },
                { name: 'Tie', sku: 'TIE-GRN', price: 20, noEmbroidery: true },
                { name: 'Vest', sku: 'VEST-GRN', price: 45 }
            ]
        },
        {
            code: 'ROSARY', name: "Rosary School", products: [
                { name: 'Polo Shirt', sku: 'POLO-BLU', price: 45 },
                { name: 'Jumper', sku: 'JUMP-BLU', price: 60 },
                { name: 'Bag', sku: 'BAG-BLU', price: 50, noEmbroidery: true }
            ]
        },
        {
            code: 'MERCY', name: "Mercy College", products: [
                { name: 'Blouse', sku: 'BLOUSE-WHT', price: 40 },
                { name: 'Skirt', sku: 'SKIRT-CHK', price: 65 },
                { name: 'Blazer', sku: 'BLZ-NVY', price: 110 }
            ]
        },
        {
            code: 'FLAXMILL', name: "Flaxmill School", products: [
                { name: 'Polo Shirt', sku: 'POLO-TEAL', price: 35 },
                { name: 'Hoodie', sku: 'HOOD-TEAL', price: 55 },
                { name: 'Track Pant', sku: 'PANT-BLK', price: 45 }
            ]
        }
    ];

    const orders: Order[] = [];
    let orderIdCounter = 2000;

    schools.forEach(school => {
        // Generate 50 orders per school for volume
        for (let i = 0; i < 50; i++) {
            const isDone = Math.random() > 0.3; // 70% are DONE (READY_TO_PACK) for density

            const hoursInQueue = Math.floor(Math.random() * 72);

            const numItems = Math.floor(Math.random() * 4) + 1;
            const items = [];

            for (let j = 0; j < numItems; j++) {
                const prod = school.products[Math.floor(Math.random() * school.products.length)];
                const size = ['8', '10', '12', '14', 'S', 'M', 'L', 'XL'][Math.floor(Math.random() * 8)];
                const qty = Math.floor(Math.random() * 3) + 1;
                const requiresEmbroidery = !prod.noEmbroidery;

                items.push({
                    id: `gen-${orderIdCounter}-${j}`,
                    product_name: prod.name,
                    sku: `${prod.sku}-${size}`,
                    quantity: qty,
                    size: size,
                    requires_embroidery: requiresEmbroidery,
                    embroidery_status: requiresEmbroidery ? (isDone ? 'DONE' : 'PENDING') : undefined as 'PENDING' | 'DONE' | undefined
                });
            }

            const deliveryType = Math.random() > 0.6 ? 'SCHOOL' : (Math.random() > 0.5 ? 'HOME' : 'STORE');
            let carrier = undefined;
            if (deliveryType === 'HOME') {
                carrier = Math.random() > 0.5 ? 'AusPost' : 'StarTrack';
            }

            // Student names for realism
            const firstNames = ['James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'Lucas', 'Mia', 'Henry', 'Amelia'];
            const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
            const studentName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

            orders.push({
                id: `gen-${orderIdCounter}`,
                woo_order_id: orderIdCounter,
                order_number: `SUS-${orderIdCounter}`,
                parent_name: `Parent of ${studentName.split(' ')[0]}`,
                student_name: studentName,
                school_code: school.code,
                school_name: school.name,
                delivery_type: deliveryType,
                carrier: carrier,
                embroidery_status: isDone ? 'DONE' : 'PENDING',
                order_status: isDone ? 'AWAITING_PACK' : 'AWAITING_EMBROIDERY',
                items: items,
                created_at: hoursAgo(hoursInQueue),
                paid_at: hoursAgo(hoursInQueue - 1),
                embroidery_done_at: isDone ? hoursAgo(1) : undefined,

                // Senior Logic
                is_senior_order: Math.random() > 0.8, // 20% Senior Orders
                student_last_name: lastNames[Math.floor(Math.random() * lastNames.length)],
                student_nickname: Math.random() > 0.5 ? ['Jaza', 'Robbo', 'Smithy', 'Ace', 'Champs'][Math.floor(Math.random() * 5)] : undefined,
                class_id: ['12A', '12B', '12C'][Math.floor(Math.random() * 3)],
                garment_type: Math.random() > 0.5 ? 'Senior Polo' : 'Leavers Hoodie'
            });
            orderIdCounter++;
        }
    });

    return orders;
};

// Mock orders data
const mockOrders: Order[] = [
    ...generateAdditionalOrders(), // Spread generated orders first
    // Embroidery Queue (PENDING)
    {
        id: '1',
        woo_order_id: 1001,
        order_number: 'SUS-1001',
        parent_name: 'Sarah Mitchell',
        student_name: 'Emma Mitchell',
        school_code: 'STMARY',
        school_name: "St Mary's College",
        delivery_type: 'SCHOOL',
        embroidery_status: 'PENDING',
        order_status: 'AWAITING_EMBROIDERY',
        items: [
            { id: 'i1', product_name: 'Polo Shirt', sku: 'POLO-NVY-10', quantity: 2, size: '10', requires_embroidery: true, embroidery_status: 'PENDING' },
            { id: 'i2', product_name: 'Dress', sku: 'DRESS-NVY-10', quantity: 1, size: '10', requires_embroidery: true, embroidery_status: 'PENDING' },
        ],
        created_at: hoursAgo(48),
        paid_at: hoursAgo(47),
    },
    {
        id: '2',
        woo_order_id: 1002,
        order_number: 'SUS-1002',
        parent_name: 'Michael Chen',
        student_name: 'Lucas Chen',
        school_code: 'STMARY',
        school_name: "St Mary's College",
        delivery_type: 'HOME',
        embroidery_status: 'PENDING',
        order_status: 'AWAITING_EMBROIDERY',
        items: [
            { id: 'i3', product_name: 'Polo Shirt', sku: 'POLO-NVY-12', quantity: 3, size: '12', requires_embroidery: true, embroidery_status: 'PENDING' },
        ],
        created_at: hoursAgo(24),
        paid_at: hoursAgo(23),
        shipping_address: { line1: '42 Maple Street', city: 'Adelaide', state: 'SA', postcode: '5000' },
    },
    {
        id: '3',
        woo_order_id: 1003,
        order_number: 'SUS-1003',
        parent_name: 'Jessica Brown',
        student_name: 'Olivia Brown',
        school_code: 'STPETER',
        school_name: "St Peter's Primary",
        delivery_type: 'SCHOOL',
        embroidery_status: 'PENDING',
        order_status: 'AWAITING_EMBROIDERY',
        items: [
            { id: 'i4', product_name: 'Polo Shirt', sku: 'POLO-WHT-8', quantity: 2, size: '8', requires_embroidery: true, embroidery_status: 'PENDING' },
            { id: 'i5', product_name: 'Shorts', sku: 'SHORT-NVY-8', quantity: 2, size: '8', requires_embroidery: false },
        ],
        created_at: hoursAgo(6),
        paid_at: hoursAgo(5),
    },
    {
        id: '4',
        woo_order_id: 1004,
        order_number: 'SUS-1004',
        parent_name: 'David Wilson',
        student_name: 'Jack Wilson',
        school_code: 'STPETER',
        school_name: "St Peter's Primary",
        delivery_type: 'STORE',
        embroidery_status: 'PENDING',
        order_status: 'AWAITING_EMBROIDERY',
        items: [
            { id: 'i6', product_name: 'Polo Shirt', sku: 'POLO-NVY-14', quantity: 1, size: '14', requires_embroidery: true, embroidery_status: 'PENDING' },
        ],
        created_at: hoursAgo(2),
        paid_at: hoursAgo(2),
    },

    // Distribution Queue - READY_TO_PACK
    {
        id: '5',
        woo_order_id: 1005,
        order_number: 'SUS-1005',
        parent_name: 'Amanda Taylor',
        student_name: 'Sophie Taylor',
        school_code: 'STMARY',
        school_name: "St Mary's College",
        delivery_type: 'SCHOOL',
        embroidery_status: 'DONE',
        order_status: 'AWAITING_PACK',
        items: [
            { id: 'i7', product_name: 'Polo Shirt', sku: 'POLO-NVY-10', quantity: 2, size: '10', requires_embroidery: true, embroidery_status: 'DONE' },
        ],
        created_at: hoursAgo(72),
        paid_at: hoursAgo(71),
        embroidery_done_at: hoursAgo(48),
    },
    {
        id: '6',
        woo_order_id: 1006,
        order_number: 'SUS-1006',
        parent_name: 'Robert Garcia',
        student_name: 'Isabella Garcia',
        school_code: 'STMARY',
        school_name: "St Mary's College",
        delivery_type: 'SCHOOL',
        embroidery_status: 'DONE',
        order_status: 'AWAITING_PACK',
        items: [
            { id: 'i8', product_name: 'Dress', sku: 'DRESS-NVY-12', quantity: 2, size: '12', requires_embroidery: true },
            { id: 'i9', product_name: 'Cardigan', sku: 'CARD-NVY-12', quantity: 1, size: '12', requires_embroidery: true },
        ],
        created_at: hoursAgo(60),
        paid_at: hoursAgo(59),
        embroidery_done_at: hoursAgo(36),
    },
    {
        id: '7',
        woo_order_id: 1007,
        order_number: 'SUS-1007',
        parent_name: 'Emily Johnson',
        student_name: 'Noah Johnson',
        school_code: 'STPETER',
        school_name: "St Peter's Primary",
        delivery_type: 'HOME',
        embroidery_status: 'DONE',
        order_status: 'AWAITING_PACK',
        items: [
            { id: 'i10', product_name: 'Polo Shirt', sku: 'POLO-WHT-10', quantity: 3, size: '10', requires_embroidery: true },
        ],
        created_at: hoursAgo(30),
        paid_at: hoursAgo(29),
        embroidery_done_at: hoursAgo(12),
        shipping_address: { line1: '15 Oak Avenue', line2: 'Unit 3', city: 'Adelaide', state: 'SA', postcode: '5067' },
    },
    {
        id: '8',
        woo_order_id: 1008,
        order_number: 'SUS-1008',
        parent_name: 'James Anderson',
        student_name: 'Mia Anderson',
        school_code: 'ROSARY',
        school_name: 'Rosary School',
        delivery_type: 'STORE',
        embroidery_status: 'DONE',
        order_status: 'AWAITING_PACK',
        items: [
            { id: 'i11', product_name: 'Polo Shirt', sku: 'POLO-NVY-6', quantity: 2, size: '6', requires_embroidery: true },
        ],
        created_at: hoursAgo(20),
        paid_at: hoursAgo(19),
        embroidery_done_at: hoursAgo(8),
    },

    // Already dispatched today
    {
        id: '9',
        woo_order_id: 1009,
        order_number: 'SUS-1009',
        parent_name: 'Lisa Thomas',
        student_name: 'Ethan Thomas',
        school_code: 'STMARY',
        school_name: "St Mary's College",
        delivery_type: 'HOME',
        embroidery_status: 'DONE',
        order_status: 'DISPATCHED',
        items: [
            { id: 'i12', product_name: 'Polo Shirt', sku: 'POLO-NVY-8', quantity: 2, size: '8', requires_embroidery: true },
        ],
        created_at: hoursAgo(96),
        paid_at: hoursAgo(95),
        embroidery_done_at: hoursAgo(72),
        packed_at: hoursAgo(4),
        dispatched_at: hoursAgo(2),
        shipping_address: { line1: '8 Elm Street', city: 'Adelaide', state: 'SA', postcode: '5033' },
    },

    // Exceptions - Missing data
    {
        id: '10',
        woo_order_id: 1010,
        order_number: 'SUS-1010',
        parent_name: 'Karen White',
        student_name: null, // Missing student name
        school_code: 'STPETER',
        school_name: "St Peter's Primary",
        delivery_type: 'SCHOOL',
        embroidery_status: 'PENDING',
        order_status: 'AWAITING_EMBROIDERY',
        items: [
            { id: 'i13', product_name: 'Polo Shirt', sku: 'POLO-NVY-10', quantity: 1, size: '10', requires_embroidery: true },
        ],
        created_at: hoursAgo(36),
        paid_at: hoursAgo(35),
    },
    {
        id: '11',
        woo_order_id: 1011,
        order_number: 'SUS-1011',
        parent_name: 'Tom Harris',
        student_name: 'Ava Harris',
        school_code: null, // Missing school code
        school_name: '',
        delivery_type: 'SCHOOL',
        embroidery_status: 'PENDING',
        order_status: 'AWAITING_EMBROIDERY',
        items: [
            { id: 'i14', product_name: 'Dress', sku: 'DRESS-NVY-8', quantity: 1, size: '8', requires_embroidery: true },
        ],
        created_at: hoursAgo(28),
        paid_at: hoursAgo(27),
    },
    {
        id: '12',
        woo_order_id: 1012,
        order_number: 'SUS-1012',
        parent_name: 'Nancy Clark',
        student_name: null, // Missing both
        school_code: null,
        school_name: '',
        delivery_type: 'SCHOOL',
        embroidery_status: 'PENDING',
        order_status: 'AWAITING_EMBROIDERY',
        items: [
            { id: 'i15', product_name: 'Polo Shirt', sku: 'POLO-WHT-12', quantity: 2, size: '12', requires_embroidery: true },
        ],
        created_at: hoursAgo(18),
        paid_at: hoursAgo(17),
    },
];

// Local mock storage
const mockEvents: import('./types').ScheduleEvent[] = [];
const mockFixUps: import('./types').FixUpRequest[] = [
    {
        id: 'fix-101',
        original_order_id: 'gen-2045',
        original_order_number: 'SUS-2045',
        student_name: 'Emma Jones',
        school_name: "St Mary's College",
        type: 'SIZE_EXCHANGE',
        status: 'OPEN',
        priority: 'HIGH',
        items: [
            { id: 'fix-i1', product_name: 'Polo Shirt', sku: 'POLO-NVY-12', quantity: 1, size: '12', requires_embroidery: true, embroidery_status: 'PENDING' }
        ],
        notes: 'Parent returned size 10, needs size 12. Priority.',
        created_at: hoursAgo(2)
    }
];

const mockPackOutManifests: import('./types').PackOutManifest[] = [];
const mockProposals: import('./types').Proposal[] = [];

export class MockAdapter implements DataAdapter {
    async getDashboardStats(): Promise<DashboardStats> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return {
            awaiting_embroidery: mockOrders.filter(o => o.embroidery_status === 'PENDING').length,
            ready_to_pack: mockOrders.filter(o => o.order_status === 'AWAITING_PACK').length,
            dispatched_today: mockOrders.filter(o => {
                if (!o.dispatched_at) return false;
                return new Date(o.dispatched_at) >= today;
            }).length,
            exceptions: mockOrders.filter(o => o.order_status === 'EXCEPTION').length,
        };
    }

    async getRecentActivity(): Promise<import('./types').HistoryEvent[]> {
        return [];
    }

    async getPendingCollections(): Promise<Array<{ schoolName: string; count: number }>> {
        return [];
    }

    async getEmbroideryQueue(): Promise<Order[]> {
        return mockOrders
            .filter(o => o.embroidery_status === 'PENDING' && o.student_name && o.school_code)
            .sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime());
    }

    async getDistributionQueue(deliveryType?: DeliveryType, statuses: OrderStatus[] = ['AWAITING_PACK']): Promise<Order[]> {
        let orders = mockOrders.filter(o => statuses.includes(o.order_status));
        if (deliveryType) {
            orders = orders.filter(o => o.delivery_type === deliveryType);
        }
        return orders.sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime());
    }

    async getSchoolRuns(): Promise<SchoolRunGroup[]> {
        const schoolOrders = mockOrders.filter(
            o => ['AWAITING_PACK', 'PACKED'].includes(o.order_status) && o.delivery_type === 'SCHOOL' && o.school_code
        );

        const grouped = schoolOrders.reduce((acc, order) => {
            const code = order.school_code!;
            if (!acc[code]) {
                acc[code] = {
                    school_code: code,
                    school_name: order.school_name,
                    order_count: 0,
                    item_count: 0,
                    orders: [],
                };
            }
            acc[code].order_count++;
            acc[code].item_count += order.items.reduce((sum, item) => sum + item.quantity, 0);
            acc[code].orders.push(order);
            return acc;
        }, {} as Record<string, SchoolRunGroup>);

        return Object.values(grouped).sort((a, b) => a.school_name.localeCompare(b.school_name));
    }

    async getExceptions(): Promise<ExceptionOrder[]> {
        return mockOrders
            .filter(o => !o.student_name || !o.school_code)
            .map(o => ({
                ...o,
                exception_type: !o.student_name && !o.school_code
                    ? 'MISSING_BOTH'
                    : !o.student_name
                        ? 'MISSING_STUDENT_NAME'
                        : 'MISSING_SCHOOL_CODE',
            })) as ExceptionOrder[];
    }

    async getOrderById(orderId: string): Promise<Order | null> {
        return mockOrders.find(o => o.id === orderId) || null;
    }

    async markBatchSkuComplete(schoolName: string, sku: string, size: string): Promise<void> {
        // Find all orders for this school
        const orders = mockOrders.filter(o => o.school_name === schoolName && o.embroidery_status !== 'DONE');

        for (const order of orders) {
            let orderUpdated = false;

            // Update matching items
            order.items.forEach(item => {
                if (item.requires_embroidery && item.sku === sku && item.size === size && item.embroidery_status !== 'DONE') {
                    item.embroidery_status = 'DONE';
                    orderUpdated = true;
                }
            });

            // Re-evaluate Order Status
            if (orderUpdated) {
                const pendingItems = order.items.filter(i => i.requires_embroidery && i.embroidery_status !== 'DONE');
                const doneItems = order.items.filter(i => i.requires_embroidery && i.embroidery_status === 'DONE');

                if (pendingItems.length === 0 && doneItems.length > 0) {
                    const prevState = { ...order };
                    order.embroidery_status = 'DONE';
                    order.embroidery_done_at = new Date().toISOString();

                    await EventLogger.log(order.id, 'ORDER', 'STATUS_CHANGE', 'EMBROIDERY_MACHINE', {
                        prevState: { embroidery_status: prevState.embroidery_status },
                        newState: { embroidery_status: order.embroidery_status },
                        metadata: { method: 'markBatchSkuComplete', sku, size }
                    });

                } else if (doneItems.length > 0 && order.embroidery_status !== 'PARTIAL') {
                    const prevState = { ...order };
                    order.embroidery_status = 'PARTIAL';

                    await EventLogger.log(order.id, 'ORDER', 'STATUS_CHANGE', 'EMBROIDERY_MACHINE', {
                        prevState: { embroidery_status: prevState.embroidery_status },
                        newState: { embroidery_status: order.embroidery_status },
                        metadata: { method: 'markBatchSkuComplete', sku, size }
                    });
                }
            }
        }
    }

    async markEmbroideryComplete(orderId: string): Promise<void> {
        const order = mockOrders.find(o => o.id === orderId);
        if (order) {
            if (order.embroidery_status === 'PENDING') {
                const prevState = { ...order };
                order.embroidery_status = 'DONE';
                order.embroidery_done_at = new Date().toISOString();

                await EventLogger.log(order.id, 'ORDER', 'STATUS_CHANGE', 'OPERATOR', {
                    prevState: { embroidery_status: prevState.embroidery_status },
                    newState: { embroidery_status: order.embroidery_status },
                    metadata: { method: 'markEmbroideryComplete' }
                });

                // Move logic: For mock purposes, we usually shift to READY_TO_PACK
                // But if we want Undo, we shouldn't immediately "move" it out of the list if querying by PENDING?
                // The current viewer filters by SCHOOL, so status change is fine.
                // However, the *Batch* logic might exclude it if we re-fetch.
                // For now, let's keep it simple: It stays in the order list but marked done.
            } else {
                // Undo
                order.embroidery_status = 'PENDING';
                order.embroidery_done_at = undefined;
            }
        }
    }

    async packOrder(orderId: string): Promise<void> {
        const order = mockOrders.find(o => o.id === orderId);
        if (order) {
            const prevState = { ...order };
            order.order_status = 'PACKED';
            order.packed_at = new Date().toISOString();

            await EventLogger.log(order.id, 'ORDER', 'STATUS_CHANGE', 'PACKER', {
                prevState: { status: prevState.order_status },
                newState: { status: order.order_status },
                metadata: { method: 'packOrder' }
            });
        }
    }

    async dispatchOrder(orderId: string): Promise<void> {
        const order = mockOrders.find(o => o.id === orderId);
        if (order) {
            const prevState = { ...order };
            order.order_status = 'Shipped';
            order.dispatched_at = new Date().toISOString();

            await EventLogger.log(order.id, 'ORDER', 'STATUS_CHANGE', 'SYSTEM', {
                prevState: { status: prevState.order_status },
                newState: { status: order.order_status },
                metadata: { method: 'dispatchOrder' }
            });
        }
    }

    async markReadyForPickup(orderId: string): Promise<void> {
        const order = mockOrders.find(o => o.id === orderId);
        if (order) {
            const prevState = { ...order };
            order.order_status = 'PACKED'; // 'READY_FOR_PICKUP' maps to PACKED in canonical model

            await EventLogger.log(order.id, 'ORDER', 'STATUS_CHANGE', 'STORE_STAFF', {
                prevState: { status: prevState.order_status },
                newState: { status: order.order_status },
                metadata: { method: 'markReadyForPickup' }
            });
        }
    }

    async moveToStaged(orderId: string, location: string): Promise<void> {
        const order = mockOrders.find(o => o.id === orderId);
        if (order) {
            const prevState = { ...order };
            order.order_status = 'PACKED'; // 'STAGED' maps to PACKED with location
            order.staging_location = location;

            await EventLogger.log(order.id, 'ORDER', 'STATUS_CHANGE', 'STORE_STAFF', {
                prevState: { status: prevState.order_status, staging_location: prevState.staging_location },
                newState: { status: order.order_status, staging_location: location },
                metadata: { method: 'moveToStaged', location }
            });
        }
    }

    async updateOrderStatus(orderId: string, status: string): Promise<void> {
        const order = mockOrders.find(o => o.id === orderId);
        if (order) {
            const prevState = { ...order };
            order.order_status = status;
            await EventLogger.log(orderId, 'ORDER', 'STATUS_CHANGE', 'SYSTEM', {
                prevState: { status: prevState.order_status },
                newState: { status }
            });
        }
    }


    async packSchoolRun(schoolCode: string): Promise<void> {
        const orders = mockOrders.filter(o =>
            o.school_code === schoolCode &&
            o.delivery_type === 'SCHOOL' &&
            o.order_status === 'AWAITING_PACK'
        );

        for (const order of orders) {
            const prevState = { ...order };
            order.order_status = 'PACKED';
            order.packed_at = new Date().toISOString();

            await EventLogger.log(order.id, 'ORDER', 'STATUS_CHANGE', 'PACKER', {
                prevState: { status: prevState.order_status },
                newState: { status: order.order_status },
                metadata: { schoolRun: schoolCode }
            });
        }
    }

    async dispatchSchoolRun(schoolCode: string): Promise<void> {
        const orders = mockOrders.filter(o =>
            o.school_code === schoolCode &&
            o.delivery_type === 'SCHOOL' &&
            o.order_status === 'Shipped'
        );

        for (const order of orders) {
            const prevState = { ...order };
            order.order_status = 'Completed';

            await EventLogger.log(order.id, 'ORDER', 'STATUS_CHANGE', 'LOGISTICS', {
                prevState: { status: prevState.order_status },
                newState: { status: order.order_status },
                metadata: { schoolRun: schoolCode }
            });
        }
    }

    async dispatchCarrierBatch(carrierName: string): Promise<void> {
        const orders = mockOrders.filter(o =>
            o.carrier === carrierName &&
            o.delivery_type === 'HOME' &&
            o.order_status === 'PACKED' // Assuming they must be packed first? Or dispatch from Ready? 
            // The requirement says "Home Shipping: Dispatch multiple orders at once". 
            // Ideally flow is Ready -> Packed -> Dispatched. 
            // For now assuming we are dispatching PACKED orders.
        );

        for (const order of orders) {
            const prevState = { ...order };
            order.order_status = 'DISPATCHED';
            order.dispatched_at = new Date().toISOString();

            await EventLogger.log(order.id, 'ORDER', 'STATUS_CHANGE', 'LOGISTICS', {
                prevState: { status: prevState.order_status },
                newState: { status: order.order_status },
                metadata: { carrierBatch: carrierName }
            });
        }
    }

    async resolveException(orderId: string, updates: Partial<Order>): Promise<void> {
        const order = mockOrders.find(o => o.id === orderId);
        if (order) {
            const prevState = { ...order };
            Object.assign(order, updates);

            // Determine event type based on updates
            let eventType: 'STATUS_CHANGE' | 'EDIT' = 'EDIT';
            if (updates.order_status && updates.order_status !== prevState.order_status) {
                eventType = 'STATUS_CHANGE';
            }

            await EventLogger.log(order.id, 'ORDER', eventType, 'SUPPORT', {
                prevState: eventType === 'STATUS_CHANGE' ? { status: prevState.order_status } : undefined,
                newState: eventType === 'STATUS_CHANGE' ? { status: order.order_status } : updates,
                metadata: { method: 'resolveException', updates }
            });
        }
    }

    async getAnalyticsOverview(period: '7d' | '30d' | 'ytd' = '30d'): Promise<AnalyticsData> {
        // Generate mock trend data
        const chartData = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            return {
                date: date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' }),
                value: Math.floor(Math.random() * 5000) + 1000, // Daily Sales
                secondaryValue: Math.floor(Math.random() * 4000) + 800, // Prev Period
                label: date.toISOString().split('T')[0]
            };
        });

        const totalSales = chartData.reduce((sum, day) => sum + day.value, 0);

        return {
            summary: {
                totalSales,
                netSales: Math.floor(totalSales * 0.92), // Deduct hypothetical returns
                ordersCount: Math.floor(totalSales / 120), // Approx $120 AOV
                itemsSold: Math.floor(totalSales / 45),    // Approx $45 per item
                avgOrderValue: 120,
                returns: Math.floor(totalSales * 0.08)
            },
            chartData,
            leaderboard: [
                { label: 'Polo Shirt (Navy)', value: 450, subValue: '$22,500' },
                { label: 'Summer Dress', value: 320, subValue: '$18,600' },
                { label: 'Sports Short', value: 280, subValue: '$9,800' },
                { label: 'Winter Jacket', value: 150, subValue: '$12,750' },
            ]
        };
    }

    async releasePartialBatch(schoolCode: string): Promise<void> {
        // Find all orders for this school that are PARTIAL or DONE embroidery status
        // and set their Order Status to READY_TO_PACK so they show up in Distribution.
        const relevantOrders = mockOrders.filter(o =>
            o.school_code === schoolCode &&
            ['AWAITING_EMBROIDERY', 'EXCEPTION'].includes(o.order_status) &&
            (o.embroidery_status === 'DONE' || o.embroidery_status === 'PARTIAL')
        );

        for (const o of relevantOrders) {
            const prevState = { ...o };
            o.order_status = 'AWAITING_PACK';

            await EventLogger.log(o.id, 'ORDER', 'STATUS_CHANGE', 'MANAGER', {
                prevState: { status: prevState.order_status },
                newState: { status: o.order_status },
                metadata: { method: 'releasePartialBatch', schoolCode }
            });
        }
    }

    async getSchoolBatches(): Promise<import('./types').EmbroideryBatch[]> {
        const orders = await this.getEmbroideryQueue();
        const batches: Record<string, import('./types').EmbroideryBatch> = {};

        orders.forEach(order => {
            const schoolName = order.school_name;
            // Key by School + IsSenior to separate batches
            const batchKey = `${schoolName}-${order.is_senior_order ? 'SENIOR' : 'REGULAR'}`;

            const isSenior = !!order.is_senior_order;
            const isReplenishment = !isSenior; // All non-senior are now Replenishment driven

            if (!batches[batchKey]) {
                // Mock cutoff: 14 days from now for demo
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() + 14);

                batches[batchKey] = {
                    school_name: schoolName,
                    order_count: 0,
                    total_units: 0,
                    oldest_order_date: order.created_at,
                    sku_summary: {},
                    orders: [],
                    is_senior_batch: isSenior,
                    cutoff_date: isSenior ? cutoffDate.toISOString() : undefined,

                    // Replenishment Fields
                    is_replenishment: isReplenishment,
                    target_school_code: order.school_code || undefined,
                    priority_level: isReplenishment ? (Math.random() > 0.7 ? 'URGENT' : 'NORMAL') : undefined,

                    batch_status: 'OPEN' // Default to OPEN for now
                };
            }

            const batch = batches[batchKey];
            batch.order_count++;
            batch.orders.push(order);

            // Track oldest
            if (new Date(order.created_at) < new Date(batch.oldest_order_date)) {
                batch.oldest_order_date = order.created_at;
            }

            // SKU & Units aggregation
            order.items.forEach(item => {
                if (item.requires_embroidery) {
                    batch.total_units += item.quantity;

                    if (!batch.sku_summary[item.sku]) {
                        batch.sku_summary[item.sku] = { name: item.product_name, sizes: {} };
                    }

                    const size = item.size || 'N/A';
                    if (!batch.sku_summary[item.sku].sizes[size]) {
                        batch.sku_summary[item.sku].sizes[size] = { total: 0, completed: 0 };
                    }

                    batch.sku_summary[item.sku].sizes[size].total += item.quantity;

                    if (item.embroidery_status === 'DONE') {
                        batch.sku_summary[item.sku].sizes[size].completed += item.quantity;
                    }
                }
            });
        });

        // Convert to array and sort by oldest batch first
        return Object.values(batches).sort((a, b) =>
            new Date(a.oldest_order_date).getTime() - new Date(b.oldest_order_date).getTime()
        );
    }

    async getAnalyticsSummary(filters?: Partial<import('./analytics-types').AnalyticsFilters>): Promise<import('./analytics-types').AnalyticsSummary> {
        return getAnalyticsSummary(filters);
    }

    async getPackingSessions(): Promise<SchoolRunGroup[]> {
        // Get ALL ready to pack orders, regardless of delivery type
        const orders = mockOrders.filter(o => o.order_status === 'AWAITING_PACK');

        const grouped = orders.reduce((acc, order) => {
            const code = order.school_code!;
            if (!acc[code]) {
                acc[code] = {
                    school_code: code,
                    school_name: order.school_name,
                    order_count: 0,
                    item_count: 0,
                    orders: [],
                };
            }
            acc[code].order_count++;
            acc[code].item_count += order.items.reduce((sum, item) => sum + item.quantity, 0);
            acc[code].orders.push(order);
            return acc;
        }, {} as Record<string, SchoolRunGroup>);

        return Object.values(grouped).sort((a, b) => a.school_name.localeCompare(b.school_name));
    }

    // --- History & Audit ---
    async getHistoryOrders(schoolCode?: string | null): Promise<import('./types').OrderHistoryRecord[]> {
        // Generate mock history records on the fly similar to HistoryContext
        // In a real app, this would query an audit table

        const norm = (v: string | null | undefined) => (v || '').trim().toUpperCase();
        const target = schoolCode?.trim() ? norm(schoolCode) : '';

        // Let's create a helper to map our Order to OrderHistoryRecord
        let ordersToMap = target
            ? mockOrders.filter(o => {
                const code = norm(o.school_code);
                const name = norm(o.school_name);
                return code === target || code.startsWith(target) || target.startsWith(code) || (name && (name.includes(target) || target.includes(name)));
            })
            : mockOrders;

        const historyOrders = ordersToMap.map(o => {
            // Map items
            const items = o.items.map(i => ({
                itemId: i.id,
                sku: i.sku,
                productName: i.product_name,
                size: i.size || 'N/A',
                qty: i.quantity,
                status: i.embroidery_status === 'DONE' ? 'PACKED' : (i.requires_embroidery ? 'PENDING' : 'PACKED') // Simplified
            })) as import('./types').OrderHistoryItem[];

            // Fake some events based on status
            const events: import('./types').HistoryEvent[] = [
                {
                    id: `evt-${o.id}-1`,
                    entityType: 'ORDER',
                    entityId: o.order_number,
                    action: 'CREATED',
                    details: 'Order received from WooCommerce',
                    actor: 'System',
                    timestamp: new Date(o.created_at)
                }
            ];

            if (o.paid_at) {
                events.push({
                    id: `evt-${o.id}-2`,
                    entityType: 'ORDER',
                    entityId: o.order_number,
                    action: 'STATUS_CHANGE',
                    details: 'Payment confirmed',
                    actor: 'System',
                    timestamp: new Date(o.paid_at)
                });
            }

            if (o.embroidery_done_at) {
                events.push({
                    id: `evt-${o.id}-3`,
                    entityType: 'ORDER',
                    entityId: o.order_number,
                    action: 'EMBROIDERY_RUN',
                    details: 'Embroidery completed',
                    actor: 'Operator 1',
                    timestamp: new Date(o.embroidery_done_at)
                });
            }

            // Map status loosely
            let status: import('./types').OrderHistoryRecord['status'] = 'PENDING';
            if (o.order_status === 'IMPORTED' || o.order_status === 'AWAITING_EMBROIDERY') status = 'IN_PROGRESS';
            if (o.order_status === 'AWAITING_PACK') status = 'READY';
            if (o.order_status === 'DISPATCHED' || o.order_status === 'COLLECTED') status = 'COMPLETED';

            return {
                id: o.id,
                orderId: o.order_number,
                studentName: o.student_name || 'N/A',
                parentName: o.parent_name,
                schoolName: o.school_name,
                schoolCode: o.school_code || 'N/A',
                deliveryType: o.delivery_type,
                status: status,
                items: items,
                createdAt: new Date(o.created_at),
                updatedAt: new Date(o.paid_at || o.created_at), // simple fallback
                hasIssues: o.order_status === 'EXCEPTION',
                hasPartialEmbroidery: o.embroidery_status === 'PARTIAL',
                hasNotes: false,
                events: events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            };
        });

        return historyOrders.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    async getHistoryBatches(): Promise<import('./types').BatchHistoryRecord[]> {
        // Return some mock batches based on our data
        return [
            {
                batchId: 'MB-290',
                schoolName: "St Mary's College",
                status: 'COMPLETED',
                totalUnits: 45,
                completedUnits: 45,
                createdAt: new Date()
            }
        ];
    }

    async getHistoryRuns(): Promise<import('./types').RunHistoryRecord[]> {
        // Return some mock runs
        return [];
    }

    async updateOrderNotes(orderId: string, notes: string): Promise<void> {
        const order = mockOrders.find(o => o.id === orderId);
        if (order) {
            order.notes = notes;
            await EventLogger.log(order.id, 'ORDER', 'NOTE', 'USER', {
                newState: { notes },
                metadata: { method: 'updateOrderNotes' }
            });
        }
    }

    // --- SCHEDULE & STAFF ---

    async getStaff(): Promise<import('./types').StaffMember[]> {
        return [
            { id: 'u1', name: 'Sarah Jenkins', initials: 'SJ', role: 'EMBROIDER', avatar_color: 'bg-emerald-500' },
            { id: 'u2', name: 'Mike Ross', initials: 'MR', role: 'DISTRIBUTION', avatar_color: 'bg-blue-500' },
            { id: 'u3', name: 'Jessica Pearson', initials: 'JP', role: 'ADMIN', avatar_color: 'bg-purple-500' },
            { id: 'u4', name: 'Louis Litt', initials: 'LL', role: 'EMBROIDER', avatar_color: 'bg-amber-500' },
            { id: 'u5', name: 'Donna Paulsen', initials: 'DP', role: 'DISTRIBUTION', avatar_color: 'bg-rose-500' },
        ];
    }

    async getScheduleEvents(start: Date, end: Date): Promise<import('./types').ScheduleEvent[]> {
        // Generate some mock events if empty
        if (mockEvents.length === 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Production Runs
            mockEvents.push({
                id: 'evt-1',
                title: 'St Mary\'s Blaze Run',
                type: 'PRODUCTION',
                status: 'IN_PROGRESS',
                start_date: new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9 AM
                end_date: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(), // 2 PM
                staff_ids: ['u1', 'u4'],
                created_at: hoursAgo(24),
                notes: 'Priority: Grade 12 Blazers'
            });

            // 2. Dispatch
            mockEvents.push({
                id: 'evt-2',
                title: 'AusPost Collection',
                type: 'DISPATCH',
                status: 'SCHEDULED',
                start_date: new Date(today.getTime() + 15 * 60 * 60 * 1000).toISOString(), // 3 PM
                end_date: new Date(today.getTime() + 16 * 60 * 60 * 1000).toISOString(), // 4 PM
                staff_ids: ['u2'],
                created_at: hoursAgo(48),
            });

            // 3. Senior Priority
            mockEvents.push({
                id: 'evt-3',
                title: 'Senior Hoodies Prep',
                type: 'SENIOR_PRIORITY',
                status: 'COMPLETED',
                start_date: new Date(today.getTime() + 7 * 60 * 60 * 1000).toISOString(), // 7 AM
                end_date: new Date(today.getTime() + 11 * 60 * 60 * 1000).toISOString(), // 11 AM
                staff_ids: ['u3'],
                created_at: hoursAgo(24),
                completed_at: new Date(today.getTime() + 11 * 60 * 60 * 1000).toISOString(),
                is_locked: true
            });

            // 4. Future event
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            mockEvents.push({
                id: 'evt-4',
                title: 'St Peter\'s Full Run',
                type: 'PRODUCTION',
                status: 'SCHEDULED',
                start_date: new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8 AM
                end_date: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000).toISOString(), // 4 PM
                staff_ids: ['u1', 'u2', 'u4'],
                created_at: hoursAgo(5),
            });
        }

        return mockEvents.filter(e => {
            const eStart = new Date(e.start_date).getTime();
            return eStart >= start.getTime() && eStart <= end.getTime();
        });
    }

    async updateEvent(event: import('./types').ScheduleEvent): Promise<void> {
        const index = mockEvents.findIndex(e => e.id === event.id);
        if (index >= 0) {
            mockEvents[index] = event;
        } else {
            mockEvents.push(event);
        }
    }

    async editOrderItems(orderId: string, updatedItems: any[]): Promise<void> {
        const order = mockOrders.find(o => o.id === orderId);
        if (order) {
            order.items = updatedItems;

            await EventLogger.log(order.id, 'ORDER', 'EDIT', 'USER', {
                metadata: { method: 'editOrderItems', itemCount: updatedItems.length }
            });
        }
    }

    async getSystemEvents(entityId: string): Promise<import('./types').SystemEvent[]> {
        return EventLogger.getHistory(entityId);
    }

    // --- WooCommerce Sync ---

    async syncStatusToWoo(orderId: string, status: string, note?: string): Promise<{ success: boolean }> {
        const order = mockOrders.find(o => o.id === orderId);
        if (order) {
            console.log(`[WooSync] Order #${order.order_number} (Woo ID: ${order.woo_order_id}) → Status: ${status}${note ? ` | Note: ${note}` : ''}`);
            await EventLogger.log(orderId, 'ORDER', 'STATUS_CHANGE', 'SYSTEM', {
                metadata: { method: 'syncStatusToWoo', wooStatus: status, note }
            });
        }
        return { success: true };
    }

    // --- Fix-Up System ---

    async searchOrders(query: string): Promise<Order[]> {
        const lowerQuery = query.toLowerCase();
        return mockOrders.filter(o =>
            o.order_number.toLowerCase().includes(lowerQuery) ||
            (o.student_name && o.student_name.toLowerCase().includes(lowerQuery)) ||
            o.parent_name.toLowerCase().includes(lowerQuery) ||
            o.school_name.toLowerCase().includes(lowerQuery) ||
            o.woo_order_id.toString().includes(lowerQuery)
        ).slice(0, 20);
    }

    async savePackOutManifest(manifest: import('./types').PackOutManifest): Promise<void> {
        mockPackOutManifests.push(manifest);
    }

    async getPackOutManifests(): Promise<import('./types').PackOutManifest[]> {
        return [...mockPackOutManifests].sort((a, b) => new Date(b.packed_at).getTime() - new Date(a.packed_at).getTime());
    }

    async getDeliveredOrders(): Promise<Order[]> {
        return mockOrders
            .filter(o => o.order_status === 'DISPATCHED' || o.order_status === 'COLLECTED')
            .sort((a, b) => (b.dispatched_at || b.packed_at || '').localeCompare(a.dispatched_at || a.packed_at || ''));
    }

    async createFixUp(request: Partial<import('./types').FixUpRequest>): Promise<void> {
        const newFixUp: import('./types').FixUpRequest = {
            id: `fix-${Date.now()}`,
            original_order_id: request.original_order_id || '',
            original_order_number: request.original_order_number || 'UNKNOWN',
            student_name: request.student_name || 'Unknown',
            school_name: request.school_name || 'Unknown',
            type: request.type || 'OTHER',
            status: request.status || 'OPEN',
            priority: request.priority || 'HIGH',
            items: request.items || [],
            notes: request.notes || '',
            created_at: new Date().toISOString()
        };
        mockFixUps.push(newFixUp);

        await EventLogger.log(newFixUp.id, 'FIX_UP', 'CREATED', 'USER', {
            newState: newFixUp,
            metadata: { originalOrder: request.original_order_number }
        });
    }

    async getFixUps(): Promise<import('./types').FixUpRequest[]> {
        return [...mockFixUps];
    }

    async updateFixUpStatus(id: string, status: import('./types').FixUpStatus): Promise<void> {
        const fixUp = mockFixUps.find(f => f.id === id);
        if (fixUp) {
            const prevState = { ...fixUp };
            fixUp.status = status;
            if (status === 'CLOSED') {
                fixUp.resolved_at = new Date().toISOString();
            }

            await EventLogger.log(id, 'FIX_UP', 'STATUS_CHANGE', 'USER', {
                prevState: { status: prevState.status },
                newState: { status },
                metadata: { method: 'updateFixUpStatus' }
            });
        }
    }

    async updateFixUp(id: string, updates: { notes?: string; status?: import('./types').FixUpStatus }): Promise<void> {
        const fixUp = mockFixUps.find(f => f.id === id);
        if (!fixUp) return;
        if (updates.notes !== undefined) fixUp.notes = updates.notes;
        if (updates.status !== undefined) {
            fixUp.status = updates.status;
            if (updates.status === 'CLOSED') fixUp.resolved_at = new Date().toISOString();
        }
    }

    // --- School Portal / VMI Methods ---

    async getSchoolPickupOrders(schoolCode: string): Promise<Order[]> {
        // Return orders that are PACKED or DISPATCHED (for school collection) and delivery_type = SCHOOL
        // Using mockOrders source
        return mockOrders.filter(o =>
            (o.school_code === schoolCode || o.school_name.includes(schoolCode)) &&
            o.delivery_type === 'SCHOOL' &&
            (o.order_status === 'PACKED' || o.order_status === 'DISPATCHED' || o.order_status === 'COLLECTED')
        ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    async getSchoolInventory(schoolCode: string): Promise<import('./types').SchoolInventoryItem[]> {
        // Mock inventory data for VMI
        const products = [
            { name: 'Polo Shirt', skuBase: 'POLO-NVY', sizes: ['8', '10', '12', '14', 'S', 'M'] },
            { name: 'Sports Short', skuBase: 'SPORT-NVY', sizes: ['8', '10', '12', '14', 'S', 'M'] },
            { name: 'Hat', skuBase: 'HAT-NVY', sizes: ['OS'] }
        ];

        const inventory: import('./types').SchoolInventoryItem[] = [];
        let idCounter = 1;

        products.forEach(p => {
            p.sizes.forEach(size => {
                const stock = Math.floor(Math.random() * 20);
                const minPar = 5;
                let status: 'OK' | 'LOW' | 'CRITICAL' = 'OK';
                if (stock === 0) status = 'CRITICAL';
                else if (stock < minPar) status = 'LOW';

                inventory.push({
                    id: `inv-${schoolCode}-${idCounter++}`,
                    product_name: p.name,
                    sku: `${p.skuBase}-${size}`,
                    size: size,
                    current_stock: stock,
                    min_par_level: minPar,
                    max_par_level: 25,
                    status: status,
                    last_restocked: hoursAgo(Math.floor(Math.random() * 300))
                });
            });
        });

        return inventory;
    }

    // --- Stock Management ---
    async getInventoryStock(): Promise<any[]> {
        return [
            { id: '1', sku: 'MOCK-1', name: 'Mock Polo', size: 'S', school_name: 'Mock School', stock_on_shelf: 10, stock_in_transit: 50, unprocessed: 2, available: 8 },
            { id: '1', sku: 'MOCK-1', name: 'Mock Polo', size: 'M', school_name: 'Mock School', stock_on_shelf: 12, stock_in_transit: 0, unprocessed: 0, available: 12 },
            { id: '2', sku: 'MOCK-2', name: 'Mock Shorts', size: '4', school_name: 'Mock School', stock_on_shelf: 5, stock_in_transit: 0, unprocessed: 5, available: 0 }
        ];
    }

    async updateStockOnShelf(productId: string, size: string, newAmount: number): Promise<void> {
        console.log(`Mock updated stock for ${productId} size ${size} to ${newAmount}`);
    }

    async updateStockInTransit(productId: string, size: string, newAmount: number): Promise<void> {
        console.log(`Mock updated transit stock for ${productId} size ${size} to ${newAmount}`);
    }

    async getUnprocessedDetails(_productId: string, _size: string): Promise<import('./types').UnprocessedDetailRow[]> {
        return [];
    }

    async updateOrderItemQuantity(_orderItemId: string, _quantity: number): Promise<void> {
        console.log('Mock updateOrderItemQuantity (no-op)');
    }

    async updateOrderItemSentQuantity(_orderItemId: string, _sentQuantity: number): Promise<void> {
        console.log('Mock updateOrderItemSentQuantity (no-op)');
    }

    async getSchools(): Promise<import('./types').School[]> {
        return [
            { id: 'STMARY', code: 'STMARY', name: "St Mary's College" },
            { id: 'FLAXMILL', code: 'FLAXMILL', name: "Flaxmill School" }
        ];
    }

    async getProductsBySchool(schoolId: string): Promise<import('./types').Product[]> {
        const codeMap: Record<string, any[]> = {
            'STMARY': [
                { name: 'Polo Shirt', sku: 'POLO-NVY', price: 35 },
                { name: 'Dress', sku: 'DRESS-NVY', price: 65 },
                { name: 'Cardigan', sku: 'CARD-NVY', price: 55 },
                { name: 'Blazer', sku: 'BLZ-NVY', price: 110 }
            ],
            'FLAXMILL': [
                { name: 'Polo Shirt', sku: 'POLO-TEAL', price: 35 },
                { name: 'Hoodie', sku: 'HOOD-TEAL', price: 55 },
                { name: 'Track Pant', sku: 'PANT-BLK', price: 45 }
            ]
        };
        const products = codeMap[schoolId] || codeMap['STMARY'];
        return products.map((p, i) => ({
            id: `prod-${schoolId}-${i}`,
            sku: p.sku,
            name: p.name,
            price: p.price,
            school_id: schoolId,
            sizes: ['4', '6', '8', '10', '12', '14', 'S', 'M', 'L', 'XL'] // Mock sizes
        }));
    }

    async getAllProducts(): Promise<import('./types').ProductListRow[]> {
        const rows: import('./types').ProductListRow[] = [
            { id: 'prod-1', sku: 'POLO-NVY', name: 'Polo Shirt', category: "St Mary's", price: 35, requires_embroidery: true, school_id: 'STMARY', school_code: 'STMARY', school_name: "St Mary's College", attributes: [{ name: 'Size', options: ['4', '6', '8', '10', '12', '14', 'S', 'M', 'L', 'XL'] }], sizes: ['4', '6', '8', '10', '12', '14', 'S', 'M', 'L', 'XL'], stock_on_shelf: {}, stock_in_transit: {}, woocommerce_id: 1001, manufacturer_name: 'AUSSIE PACIFIC', manufacturer_id: null, manufacturer_id_kids: '3307', manufacturer_id_adult: null, manufacturer_product: null, manufacturer_garment_id: null, is_available_for_sale: true, cost: 18, embroidery_print_cost: 5, xero_item_code: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'prod-2', sku: 'DRESS-NVY', name: 'Dress', category: "St Mary's", price: 65, requires_embroidery: true, school_id: 'STMARY', school_code: 'STMARY', school_name: "St Mary's College", attributes: null, sizes: [], stock_on_shelf: {}, stock_in_transit: {}, woocommerce_id: 1002, manufacturer_name: null, manufacturer_id: null, manufacturer_id_kids: null, manufacturer_id_adult: null, manufacturer_product: null, manufacturer_garment_id: null, is_available_for_sale: false, cost: null, embroidery_print_cost: null, xero_item_code: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'prod-3', sku: 'POLO-TEAL', name: 'Polo Shirt', category: 'Flaxmill', price: 35, requires_embroidery: true, school_id: 'FLAXMILL', school_code: 'FLAXMILL', school_name: 'Flaxmill School', attributes: null, sizes: [], stock_on_shelf: {}, stock_in_transit: {}, woocommerce_id: 1003, manufacturer_name: 'WinningSpirit', manufacturer_id: 'FL02', manufacturer_id_kids: null, manufacturer_id_adult: null, manufacturer_product: 'Half Zip Fleece', manufacturer_garment_id: null, is_available_for_sale: true, cost: 22, embroidery_print_cost: 4, xero_item_code: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ];
        return rows;
    }

    async updateProduct(_productId: string, _payload: import('./types').ProductUpdatePayload): Promise<void> {
        console.log('Mock updateProduct', _productId, _payload);
    }

    async createProduct(payload: import('./types').ProductCreatePayload): Promise<import('./types').ProductListRow> {
        const id = `mock-prod-${Date.now()}`;
        const now = new Date().toISOString();
        return {
            id,
            sku: payload.sku ?? null,
            name: payload.name,
            category: null,
            price: payload.price ?? 0,
            requires_embroidery: payload.requires_embroidery ?? false,
            school_id: payload.school_id ?? null,
            school_code: null,
            school_name: null,
            attributes: (payload.sizes?.length ? [{ name: 'Size', slug: 'pa_size', options: payload.sizes }] : null) as any,
            sizes: payload.sizes ?? [],
            stock_on_shelf: {},
            stock_in_transit: {},
            woocommerce_id: null,
            manufacturer_name: payload.manufacturer_name ?? null,
            manufacturer_id: payload.manufacturer_id ?? null,
            manufacturer_id_kids: payload.manufacturer_id_kids ?? null,
            manufacturer_id_adult: payload.manufacturer_id_adult ?? null,
            manufacturer_product: null,
            manufacturer_garment_id: null,
            is_available_for_sale: false,
            cost: null,
            embroidery_print_cost: null,
            xero_item_code: null,
            created_at: now,
            updated_at: now,
        };
    }

    async getBulkOrders(): Promise<Order[]> {
        return mockOrders.filter(o => o.order_number.startsWith('BULK-'));
    }

    async createSchool(name: string, code: string): Promise<import('./types').School> {
        const id = `mock-school-${Date.now()}`;
        return { id, name, code };
    }

    async createBulkOrder(
        schoolId: string,
        orderDetails: { orderNumber?: string, customerName?: string, studentName?: string, status?: string, requestedAt?: string, partialDelivery?: number[] },
        items: { productId?: string, productName: string, sku: string, size: string, quantity: number, price?: number }[]
    ): Promise<Order> {
        const orderId = `bulk-${Date.now()}`;
        const meta: Order['meta'] = {};
        if (orderDetails.requestedAt) meta.order_requested_at = orderDetails.requestedAt;
        if (orderDetails.partialDelivery?.length) meta.partial_delivery = orderDetails.partialDelivery;
        const newOrder: Order = {
            id: orderId,
            woo_order_id: -Date.now(),
            order_number: orderDetails.orderNumber || `BULK-${schoolId.substring(0, 4).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
            parent_name: orderDetails.customerName || 'School Admin',
            student_name: orderDetails.studentName || 'BULK_STOCK',
            school_id: schoolId,
            school_code: schoolId,
            school_name: schoolId, // Simplified for mock
            delivery_type: 'SCHOOL',
            embroidery_status: 'PENDING',
            order_status: (orderDetails.status as any) || 'Processing',
            items: items.map((i, idx) => ({
                id: `${orderId}-item-${idx}`,
                product_name: i.productName,
                sku: i.sku,
                size: i.size,
                quantity: i.quantity,
                requires_embroidery: false,
                embroidery_status: 'PENDING'
            })),
            created_at: new Date().toISOString(),
            paid_at: new Date().toISOString(),
            ...(Object.keys(meta).length > 0 && { meta })
        };
        mockOrders.push(newOrder);
        return newOrder;
    }

    async updateBulkOrder(
        orderId: string,
        _schoolId: string,
        orderDetails: { orderNumber?: string, customerName?: string, studentName?: string, status?: string, requestedAt?: string, partialDelivery?: number[] },
        items: { productId?: string, productName: string, sku: string, size: string, quantity: number, price?: number }[]
    ): Promise<Order> {
        const order = mockOrders.find(o => o.id === orderId);
        if (!order) throw new Error(`Order ${orderId} not found`);
        if (orderDetails.orderNumber !== undefined) order.order_number = orderDetails.orderNumber;
        if (orderDetails.customerName !== undefined) order.parent_name = orderDetails.customerName;
        if (orderDetails.studentName !== undefined) order.student_name = orderDetails.studentName;
        if (orderDetails.status !== undefined) order.order_status = orderDetails.status;
        if (orderDetails.requestedAt !== undefined || orderDetails.partialDelivery !== undefined) {
            order.meta = {
                order_requested_at: orderDetails.requestedAt ?? order.meta?.order_requested_at,
                partial_delivery: orderDetails.partialDelivery ?? order.meta?.partial_delivery ?? []
            };
        }
        order.items = items.map((i, idx) => ({
            id: `${orderId}-item-${idx}`,
            product_name: i.productName,
            sku: i.sku,
            size: i.size,
            quantity: i.quantity,
            requires_embroidery: false,
            embroidery_status: 'PENDING' as const,
            unit_price: i.price
        }));
        return order;
    }

    async getProposals(): Promise<import('./types').Proposal[]> {
        return [...mockProposals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    async createProposal(proposal: Omit<import('./types').Proposal, 'id' | 'created_at' | 'updated_at'>): Promise<import('./types').Proposal> {
        const now = new Date().toISOString();
        const created: import('./types').Proposal = {
            id: `prop-${Date.now()}`,
            school_id: proposal.school_id ?? null,
            school_name: proposal.school_name,
            school_code: proposal.school_code,
            title: proposal.title,
            status: proposal.status,
            pdf_url: proposal.pdf_url ?? null,
            logo_url: (proposal as import('./types').Proposal).logo_url ?? null,
            template_snapshot: proposal.template_snapshot ?? {},
            template_id: proposal.template_id ?? null,
            created_at: now,
            updated_at: now,
            sent_at: proposal.sent_at ?? null,
            reply_text: (proposal as import('./types').Proposal).reply_text ?? null,
            reply_at: (proposal as import('./types').Proposal).reply_at ?? null,
        };
        mockProposals.push(created);
        return created;
    }

    async updateProposal(id: string, updates: Partial<Pick<import('./types').Proposal, 'title' | 'status' | 'pdf_url' | 'logo_url' | 'sent_at'>>): Promise<void> {
        const p = mockProposals.find(x => x.id === id);
        if (!p) return;
        const now = new Date().toISOString();
        if (updates.title !== undefined) p.title = updates.title;
        if (updates.status !== undefined) p.status = updates.status;
        if (updates.pdf_url !== undefined) p.pdf_url = updates.pdf_url;
        if (updates.logo_url !== undefined) p.logo_url = updates.logo_url;
        if (updates.sent_at !== undefined) p.sent_at = updates.sent_at;
        p.updated_at = now;
    }
}
