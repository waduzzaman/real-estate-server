const express = require( 'express' );
const app = express();
const cors = require( 'cors' );
const jwt = require( 'jsonwebtoken' );
require( 'dotenv' ).config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

// middleware
app.use( cors() );
app.use( express.json() );


const { MongoClient, ServerApiVersion } = require( 'mongodb' );
const uri = `mongodb+srv://${ process.env.DB_USER }:${ process.env.DB_PASS }@cluster0.nrvepld.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient( uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
} );

async function run ()
{
  try
  {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    //============================Database Collections=====================================//
    const propertyCollection = client.db( "realestateDB" ).collection( "properties" );
    const wishlistCollection = client.db("realestateDB").collection("wishlist");
    const reviewsCollection = client.db("realestateDB").collection("reviews");
    



    //=================================== JWT related api==================================//
    app.post( '/jwt', async ( req, res ) =>
    {
      const user = req.body;
      const token = jwt.sign( user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' } );
      res.send( { token } );
    } )

    // middlewares 
    const verifyToken = ( req, res, next ) =>
    {
      // console.log('inside verify token', req.headers.authorization);
      if ( !req.headers.authorization )
      {
        return res.status( 401 ).send( { message: 'unauthorized access' } );
      }
      const token = req.headers.authorization.split( ' ' )[ 1 ];
      jwt.verify( token, process.env.ACCESS_TOKEN_SECRET, ( err, decoded ) =>
      {
        if ( err )
        {
          return res.status( 401 ).send( { message: 'unauthorized access' } )
        }
        req.decoded = decoded;
        next();
      } )
    }

    // use verify admin after verifyToken
    const verifyAdmin = async ( req, res, next ) =>
    {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne( query );
      const isAdmin = user?.role === 'admin';
      if ( !isAdmin )
      {
        return res.status( 403 ).send( { message: 'forbidden access' } );
      }
      next();
    }


    // GET method to fetch properties
    app.get( '/properties', async ( req, res ) =>
    {
      try
      {
        // console.log( 'Received request for properties' ); // Additional log
        const properties = await propertyCollection.find( {} ).toArray();
        // console.log( 'Properties fetched:', properties ); // Additional log
        res.status( 200 ).json( properties );
      } catch ( error )
      {
        console.error( 'Error fetching properties:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );
    ;

     // POST method to add a property to the wishlist
     app.post('/wishlist', verifyToken, async (req, res) => {
      try {
        const wishlistItem = req.body;
        wishlistItem.userEmail = req.decoded.email;  // Assuming userEmail is stored in token
        const result = await wishlistCollection.insertOne(wishlistItem);
        res.status(201).json(result);
      } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });





    // await client.db( "admin" ).command( { ping: 1 } );
    console.log( "Pinged your deployment. You successfully connected to MongoDB!" );
  } finally
  {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch( console.dir );

app.get( '/', ( req, res ) =>
{
  res.send( `Realtor is running @ PORT ${ port }` )
} )

app.listen( port, () =>
{
  console.log( `Realtor is running on port ${ port }` );
} )
