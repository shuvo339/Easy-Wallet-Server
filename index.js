const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken')
const app = express();
const bcrypt = require('bcryptjs');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bodyParser = require('body-parser');
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(bodyParser.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v8mpgvp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const users = client.db('walletDB').collection('users');
    const transactions = client.db('walletDB').collection('transactions');

        // middlewares 
        const verifyToken = (req, res, next) => {
          if (!req.headers.authorization) {
            return res.status(401).send({ message: 'unauthorized access' });
          }
          const token = req.headers.authorization.split(' ')[1];
          jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
              return res.status(401).send({ message: 'unauthorized access' })
            }
            req.decoded = decoded;
            next();
          })
        }

         //jwt related api
    // app.post('/jwt', async (req, res) => {
    //   const user = req.body;
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    //   res.send({ token })
    // })

    app.post('/register', async (req, res) => {
      const { name, pin, mobile, email } = req.body;
      console.log(req.body)
      try {
        const hashedPin = await bcrypt.hash(pin, 10);
        const newUser = { name, pin: hashedPin, mobile, email, role: 'guest', status: 'pending', balance: 0 };
        await users.insertOne(newUser);
        res.status(201).json({ message: 'User registered successfully' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/login', async (req, res) => {
      const { identifier, pin } = req.body;
      try {
        const user = await users.findOne({ 
          $or: [{ mobile: identifier }, { email: identifier }] 
        });
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        const isMatch = await bcrypt.compare(pin, user.pin);
        if (!isMatch) {
          return res.status(400).json({ error: 'Invalid PIN' });
        }
        const token = jwt.sign({ id: user._id }, 'secret', { expiresIn: '1h' });
        res.json({ token });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
 

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Welcome to EasyWallet Server')
})

app.listen(port, () => {
  console.log(`EasyWallet server is running on port ${port}`)
})