const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

// middleware 
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())





const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tpqoiya.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// kookie middleware 

const verifyToken = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({ message: 'unAuthorized access' })
    }

    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unAuthorized access' })
        }

        req.user = decoded
        next()
    })
}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db('cleanCoDB').collection('services')
        const bookingCollection = client.db('cleanCoDB').collection('booking')

        app.post('/api/v1/auth/access-token', async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1hr' })

            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false,
                    // sameSite: 'none'
                })
                .send({ success: true })
        })

        // if user logOut then token is remove from client side with user when logout 
        app.post('/api/v1/auth/logout-token', async (req, res) => {
            const user = req.body;
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })


        // bookings 
        app.post('/api/v1/user/create-booking', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            // console.log(req.cookies.token);
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })

        app.get('/api/v1/user/bookings', verifyToken, async (req, res) => {
            const queryEmail = req.query.email;
            const userEmail = req.query.email;
            if (queryEmail !== userEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            let query = {};
            if (queryEmail) {
                query.email = queryEmail
            }
            const result = await bookingCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/api/v1/user/cancel-booking/:id', async (req, res) => {
            const id = req.params.id;
            console.log(req.params);
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })



        // all services 
        app.get('/api/v1/services', verifyToken, async (req, res) => {
            // console.log(req.cookies.token);
            const result = await serviceCollection.find().toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);








app.get('/', (req, res) => {
    res.send('clean co service is running!')
})

app.listen(port, () => {
    console.log(`Example clean-co on port ${port}`)
})