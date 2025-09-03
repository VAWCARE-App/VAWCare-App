/**
 * @swagger
 * tags:
 *   - name: Victims
 *     description: Victim user management
 *   - name: Admins
 *     description: Admin user management
 *   - name: Officials
 *     description: Barangay official user management
 * 
 * /api/victims/register:
 *   post:
 *     summary: Register a new victim (anonymous or regular)
 *     tags: [Victims]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VictimRegistration'
 *     responses:
 *       201:
 *         description: Victim successfully registered
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Username or email already exists
 * 
 * /api/victims/login:
 *   post:
 *     summary: Login a victim
 *     tags: [Victims]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VictimLogin'
 *     responses:
 *       200:
 *         description: Successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token
 *                 user:
 *                   type: object
 *                   description: User information
 *       401:
 *         description: Invalid credentials
 * 
 * /api/admin/register:
 *   post:
 *     summary: Register a new admin
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminRegistration'
 *     responses:
 *       201:
 *         description: Admin successfully registered
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Admin ID or email already exists
 * 
 * /api/admin/login:
 *   post:
 *     summary: Login an admin
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminEmail:
 *                 type: string
 *                 format: email
 *               adminPassword:
 *                 type: string
 *             required:
 *               - adminEmail
 *               - adminPassword
 *     responses:
 *       200:
 *         description: Successfully logged in
 *       401:
 *         description: Invalid credentials
 * 
 * /api/officials/register:
 *   post:
 *     summary: Register a new barangay official
 *     tags: [Officials]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OfficialRegistration'
 *     responses:
 *       201:
 *         description: Official successfully registered
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Official ID or email already exists
 * 
 * /api/officials/login:
 *   post:
 *     summary: Login a barangay official
 *     tags: [Officials]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               officialEmail:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *             required:
 *               - officialEmail
 *               - password
 *     responses:
 *       200:
 *         description: Successfully logged in
 *       401:
 *         description: Invalid credentials
 * 
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
