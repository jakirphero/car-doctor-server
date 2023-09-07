const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

// middleware
app.use(cors());
app.use(express.json());

// console.log(process.env.DB_USER);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1i6kwug.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const verifyJwt = (req, res, next) => {
    console.log('hitting verify jwt');
    // console.log(req.headers.authorization);
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, messages: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1];
    console.log('token verify inside jwt', token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, messages: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const servicesCollection = client.db('carDoctor').collection('services');
        const bookingCollection = client.db('carDoctor').collection('bookingServices')

        // JWT

        app.post('/jwt', (req, res) => {
            const user = req.body;
            // console.log(user);

            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res.send({ token });
        });

        //service api
        app.get('/services', async (req, res) => {
            const cursor = servicesCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const options = {
                // Include only the `title` and `imdb` fields in the returned document
                projection: { title: 1, price: 1, services_id: 1, img: 1 },
            };

            const result = await servicesCollection.findOne(query, options);
            res.send(result);
        })


        //Bookings
        app.get('/bookings', verifyJwt, async (req, res) => {
            // console.log(req.headers.authorization);
            const decoded = req.decoded;
            // console.log('came back after verify', decoded);

            if (decoded.email !== req.query.email) {
                return res.status(403).send({ error: 1, messages: 'forbidden access' })
            }

            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/bookings', async (req, res) => {
            const bookings = req.body;
            console.log(bookings);

            const result = await bookingCollection.insertOne(bookings);
            res.send(result);
        })


        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateBookings = req.body;
            console.log(updateBookings);

            const updateDoc = {
                $set: {
                    status: updateBookings.status
                },
            };

            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
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
    res.send('doctor is running on port');
});

app.listen(port, () => {
    console.log(`doctor is running on port ${port}`);
});