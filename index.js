const express = require('express');
require('dotenv').config();
const cors = require('cors');

const app = express();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xpqzsao.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// In-memory storage for love counts
const loveCounts = {};

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    // await client.connect();
    const birdsCollection = client.db('birdsDB').collection('birds');

    app.get('/birds', async (req, res) => {
      const result = await birdsCollection.find().toArray();
      res.json(result);
    });


    app.get('/birds/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await birdsCollection.findOne(query);
      res.send(result);
    })

    app.get('/birdsCount', async (req, res) => {
      const count = await birdsCollection.estimatedDocumentCount();
      res.send({ count });
    })

    app.post('/birds', async (req, res) => {
      const item = req.body;
      const result = await birdsCollection.insertOne(item);
      res.send(result);
    });

    app.post('/birds/:birdId', async (req, res) => {
      const birdId = req.params.birdId;
    
      // Get the client's IP address from the request headers
      const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
      // Update the love count for the given IP and birdId
      const key = `${clientIP}_${birdId}`;
      loveCounts[key] = (loveCounts[key] || 0) + 1;
    
      // Update the loveStatus field in the database
      const result = await birdsCollection.updateOne(
        { _id: new ObjectId(birdId) },
        { $set: { loveStatus: loveCounts[key] } }
      );
    
      // Fetch the updated document to get the current love count
      const updatedBird = await birdsCollection.findOne({ _id: new ObjectId(birdId) });
    
      res.json({ loveCount: updatedBird.loveStatus }); // Send the love count in the response
    });



    app.patch('/birds/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          birdNameENG: item.birdNameENG,
          birdNameBD: item.birdNameBD,
          location: item.location,
          date: item.date,
          description: item.description,
          camera: item.camera,
          image: item.image,
        }
      }

      const result = await birdsCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })


     // Delete a bird by ID
     app.delete('/birds/:birdId', async (req, res) => {
      const birdId = req.params.birdId;

      try {
        const result = await birdsCollection.deleteOne({ _id: new ObjectId(birdId) });
        if (result.deletedCount === 1) {
          res.json({ success: true, message: 'Bird deleted successfully.' });
        } else {
          res.status(404).json({ success: false, message: 'Bird not found.' });
        }
      } catch (error) {
        console.error('Error deleting bird:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
      }
    });

    
    

    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 });
    // console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('birds-click is sitting');
});

app.listen(port, () => {
  console.log(`birds-click is sitting on port ${port}`);
});
