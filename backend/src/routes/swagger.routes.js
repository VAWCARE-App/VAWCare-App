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
 *               officialpassword:
 *                 type: string
 *             required:
 *               - officialEmail
 *               - officialpassword
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
 *
 * /api/admin/admins/{id}:
 *   put:
 *     summary: Update an admin
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin document _id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               adminEmail:
 *                 type: string
 *                 format: email
 *               adminRole:
 *                 type: string
 *             required: []
 *     responses:
 *       200:
 *         description: Admin updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - backend admin only
 *
 * /api/admin/admins/soft-delete/{id}:
 *   put:
 *     summary: Soft-delete an admin (mark isDeleted=true)
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin document _id
 *     responses:
 *       200:
 *         description: Admin soft-deleted successfully
 *       403:
 *         description: Forbidden - backend admin only
 *
 * /api/admin/victims/{id}:
 *   put:
 *     summary: Update a victim
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Victim document _id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               victimEmail:
 *                 type: string
 *                 format: email
 *             required: []
 *     responses:
 *       200:
 *         description: Victim updated successfully
 *       400:
 *         description: Validation error
 *
 * /api/admin/victims/soft-delete/{id}:
 *   put:
 *     summary: Soft-delete a victim (mark isDeleted=true)
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Victim document _id
 *     responses:
 *       200:
 *         description: Victim soft-deleted successfully
 *
 * /api/admin/officials/{id}:
 *   put:
 *     summary: Update a barangay official
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Official document _id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               officialEmail:
 *                 type: string
 *                 format: email
 *               position:
 *                 type: string
 *             required: []
 *     responses:
 *       200:
 *         description: Official updated successfully
 *       400:
 *         description: Validation error
 *
 * /api/admin/officials/soft-delete/{id}:
 *   put:
 *     summary: Soft-delete a barangay official (mark isDeleted=true)
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Official document _id
 *     responses:
 *       200:
 *         description: Official soft-deleted successfully
 */
