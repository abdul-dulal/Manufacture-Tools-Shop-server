const express = require("express");
const cors = require("cors");
require("dotenv").config();
var jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_KEY);

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri =
  "mongodb+srv://bagdomMain:9avFKZWiQgk3diyV@cluster0.wl76d.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  await client.connect();
  const productCollection = client.db("bagdom").collection("product");
  const userCollection = client.db("bagdom").collection("user");
  const reviewCollection = client.db("bagdom").collection("review");
  const orderCollection = client.db("bagdom").collection("order");
  const profileCollection = client.db("bagdom").collection("profile");
  const paymentCollection = client.db("bagdom").collection("payment");

  //verify jwt
  function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: "forbidden access" });
      }
      req.decoded = decoded;
      next();
    });
  }

  // payment intent
  app.post("/create-payment-intent", async (req, res) => {
    const service = req.body;
    const price = service.price;
    const amount = price * 100;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      payment_method_types: ["card"],
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  });

  app.get("/product", async (req, res) => {
    const result = await productCollection.find().toArray();
    res.send(result);
  });

  app.get("/product/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await productCollection.findOne(query);
    res.send(result);
  });

  // quantity update
  app.put("/product/:id", (req, res) => {
    const id = req.params.id;
    const user = req.body;
    const filter = { _id: ObjectId(id) };
  });

  // create admin role
  app.put("/user/admin/:email", async (req, res) => {
    const email = req.params.email;
    const filter = { email: email };
    const updateDoc = {
      $set: { role: "admin" },
    };
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
  });

  // admin role check

  app.get("user/:email", async (req, res) => {
    const email = req.params.email;
    const query = { email: email };
    const user = await userCollection.findOne(query);
    const isadmin = user.role === "admin";
    res.send({ admin: isadmin });
  });

  //update user
  app.put("/user/:email", async (req, res) => {
    const email = req.params.email;
    const user = req.body;
    const filter = { email: email };
    const options = { upsert: true };
    const updateDoc = {
      $set: user,
    };
    const result = await userCollection.updateOne(filter, updateDoc, options);
    const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
      expiresIn: "1h",
    });
    res.send({ token, result });
  });

  // add review
  app.post("/review", async (req, res) => {
    const body = req.body;
    const result = await reviewCollection.insertOne(body);
    res.send(result);
  });

  // get all review

  app.get("/review", async (req, res) => {
    const result = await reviewCollection.find().toArray();
    res.send(result.reverse());
  });

  // order post
  app.post("/order", async (req, res) => {
    const order = req.body;
    const result = await orderCollection.insertOne(order);
    res.send(result);
  });

  // get order
  app.get("/order", async (req, res) => {
    const result = await orderCollection.find().toArray();
    res.send(result);
  });

  // get oerder for payment

  app.get("/order/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: ObjectId(id) };
    const result = await orderCollection.findOne(filter);
    res.send(result);
  });

  // order update

  app.put("/order/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: ObjectId(id) };
    const payment = req.body;

    const updateDoc = {
      $set: {
        paid: true,
        transactionId: payment.transactionId,
      },
    };
    const result = await paymentCollection.insertOne(payment);
    const updateOrder = await orderCollection.updateOne(filter, updateDoc);
    res.send(updateOrder);
  });

  // update profile
  app.put("/profile/:email", async (req, res) => {
    const email = req.params.email;
    const profile = req.body;

    const filter = { email: email };
    const options = { upsert: true };
    const updateDoc = {
      $set: profile,
    };
    const result = await profileCollection.updateOne(
      filter,
      updateDoc,
      options
    );

    res.send(result);
  });

  // my profile
  app.get("/profile", async (req, res) => {
    const result = await profileCollection.find().toArray();
    res.send(result);
  });
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello From Doctor Uncle!");
});

app.listen(port, () => {
  console.log(`Doctors App listening on port ${port}`);
});
