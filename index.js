
// Naming Convention: 
// app.get('/users')
// app.get('/users/:id')
// app.post('/users')
// app.put('/users/:id')
// app.patch('/users/:id')
// app.delete('/users/:id')



const express = require( 'express' );
const app = express();
const cors = require( 'cors' );
const jwt = require( 'jsonwebtoken' );
require( 'dotenv' ).config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

// middleware
app.use(
  cors( {
    origin: [
      "http://localhost:5173",
      "https://real-estate-server-nu.vercel.app/",
      "https://real-estate-client-b69c6.firebaseapp.com/",
      "https://real-estate-client-b69c6.web.app/"
    ],
    credentials: true,
  } )
);
app.use( express.json() );


const { MongoClient, ServerApiVersion, ObjectId } = require( 'mongodb' );
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
    // const detailsCollection = client.db( 'realestateDB' ).collection( "details" );
    const wishlistCollection = client.db( "realestateDB" ).collection( "wishlist" );
    const reviewsCollection = client.db( "realestateDB" ).collection( "reviews" );
    const userCollection = client.db( "realestateDB" ).collection( 'users' );



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
      const user = await usersCollection.findOne( query );
      const isAdmin = user?.role === 'admin';
      if ( !isAdmin )
      {
        return res.status( 403 ).send( { message: 'forbidden access' } );
      }
      next();

    }



    // POST method to create a new user
    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists: 
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });



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

    // post method to wishlist: 

    app.post( '/wishlist', async ( req, res ) =>
    {
      const item = req.body;
      const result = await wishlistCollection.insertOne( item );
      console.log( result );
      res.send( result );
    } );


    app.get( '/wishlist', async ( req, res ) =>
    {
      try
      {
        // const userEmail = req.decoded.email; 
        const wishlistItems = await wishlistCollection.find().toArray();
        res.status( 200 ).json( wishlistItems );
        console.log( wishlistItems );
      } catch ( error )
      {
        console.error( 'Error fetching wishlist items:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );

    // DELETE method to remove a wishlist item by propertyId
    app.delete( '/wishlist/:propertyId', async ( req, res ) =>
    {
      const { propertyId } = req.params;

      try
      {
        const result = await wishlistCollection.deleteOne( { propertyId } );
        if ( result.deletedCount === 1 )
        {
          res.status( 200 ).json( { message: 'Wishlist item deleted successfully' } );
        } else
        {
          res.status( 404 ).json( { message: 'Wishlist item not found' } );
        }
      } catch ( error )
      {
        console.error( 'Error deleting wishlist item:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );



    // Post method to add a review
    app.post( '/reviews', async ( req, res ) =>
    {
      try
      {
        const review = req.body;
        const result = await reviewsCollection.insertOne( review );
        res.status( 201 ).json( result );
      } catch ( error )
      {
        console.error( 'Error adding review:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );

    app.get( '/reviews', async ( req, res ) =>
    {
      try
      {

        const reviewsItems = await reviewsCollection.find().toArray();
        res.status( 200 ).json( reviewsItems );
        console.log( reviewsItems );
      } catch ( error )
      {
        console.error( 'Error fetching reviews:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );


    // Delete a review by ID
    app.delete( '/reviews/:id', async ( req, res ) =>
    {
      try
      {
        const reviewId = req.params.id;
        const result = await reviewsCollection.deleteOne( { _id: new ObjectId( reviewId ) } );
        if ( result.deletedCount === 1 )
        {
          res.status( 200 ).json( { message: 'Review deleted successfully' } );
        } else
        {
          res.status( 404 ).json( { message: 'Review not found' } );
        }
      } catch ( error )
      {
        console.error( 'Error deleting review:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );





    // // Get method to fetch reviews based on property ID or user email
    // app.get('/reviews', async (req, res) => {
    //   try {
    //     const { propertyId, userEmail } = req.query;
    //     let query = {};
    //     if (propertyId) query.propertyId = propertyId;
    //     if (userEmail) query.userEmail = userEmail;

    //     const reviews = await reviewCollection.find(query).toArray();
    //     res.status(200).json(reviews);
    //   } catch (error) {
    //     console.error('Error fetching reviews:', error);
    //     res.status(500).json({ message: 'Internal Server Error' });
    //   }
    // });





    // Get method to access one property 
    app.get( '/properties/:id', async ( req, res ) =>
    {
      try
      {
        const id = req.params.id;

        const query = { _id: new ObjectId( id ) }
        const property = await propertyCollection.findOne( query );
        // res.send(result);
        // const property = await propertyCollection.findOne( { _id: new ObjectId( id ) } );

        if ( !property )
        {
          return res.status( 404 ).json( { message: 'Property not found' } ); // Corrected message
        }
        res.status( 200 ).json( property );
        // console.log( 'This is one property:', property );

      } catch ( error )
      {
        console.error( 'Error fetching property:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );






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
