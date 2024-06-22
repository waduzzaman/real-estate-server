

const express = require( 'express' );
const app = express();
const cors = require( 'cors' );
const jwt = require( 'jsonwebtoken' );
const { MongoClient, ServerApiVersion, ObjectId } = require( 'mongodb' );
require( 'dotenv' ).config();

const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors( {
    origin: [
      "http://localhost:5173",
      "http://localhost:5000",
      "https://real-estate-server-mu.vercel.app",  
       
      "https://real-estate-client-b69c6.web.app",
      "https://real-estate-client-b69c6.firebaseapp.com"
    ],
    credentials: true,
  } )
);
app.use( express.json() );

// MongoDB URI
const uri = `mongodb+srv://${ process.env.DB_USER }:${ process.env.DB_PASS }@cluster0.nrvepld.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient( uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
} );



// Async function to run server
async function run ()
{
  try
  {
    // Connect to MongoDB
    // await client.connect();
    // console.log( "Connected to MongoDB" );

    // Database Collections
    const propertyCollection = client.db( "realestateDB" ).collection( "properties" );
    const wishlistCollection = client.db( "realestateDB" ).collection( "wishlist" );
    const reviewCollection = client.db( "realestateDB" ).collection( "reviews" );
    const userCollection = client.db( "realestateDB" ).collection( 'users' );
    const requestedOfferedCollection = client.db( "realestateDB" ).collection( "requestedOffered" );
    const offerCollection = client.db( "realestateDB" ).collection( "offers" );
    const blogCollection = client.db( "realestateDB" ).collection( "blogs" );
    const testimonialCollection = client.db( "realestateDB" ).collection( "testimonials" );

    const paymentCollection = client.db( "bistroDb" ).collection( "payments" );



    // JWT related API
    app.post( '/jwt', async ( req, res ) =>
    {
      const user = req.body;
      const token = jwt.sign( user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' } );
      res.send( { token } );
    } );

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
    const verifyAgent = async ( req, res, next ) =>
    {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne( query );
      const isAgent = user?.role === 'agent';
      if ( !isAgent )
      {
        return res.status( 403 ).send( { message: 'forbidden access' } );
      }
      next();
    }


    // Users related API
    app.get( '/users', async ( req, res ) =>
    {
      const result = await userCollection.find().toArray();
      res.send( result );
    } );

    // Get Admin 

    app.get( '/users/admin/:email', async ( req, res ) =>
    {
      const email = req.params.email;

      // if ( email !== req.decoded.email )
      // {
      //   return res.status( 403 ).send( { message: 'forbidden access' } )
      // }

      const query = { email: email };
      const user = await userCollection.findOne( query );
      // console.log(user);
      let admin = false;
      if ( user )
      {
        admin = user?.role === 'admin';
      }
      res.send( { admin } );
    } )

    // get agent: 

    app.get( '/users/agent/:email', async ( req, res ) =>
    {
      const email = req.params.email;

      // if ( email !== req.decoded.email )
      // {
      //   return res.status( 403 ).send( { message: 'forbidden access' } )
      // }

      const query = { email: email };
      const user = await userCollection.findOne( query );
      // console.log(user);
      let agent = false;
      if ( user )
      {
        agent = user?.role === 'agent';
      }
      res.send( { agent } );
    } )


    app.post( '/users', async ( req, res ) =>
    {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne( query );
      if ( existingUser )
      {
        return res.send( { message: 'User already exists', insertedId: null } );
      }
      const result = await userCollection.insertOne( user );
      res.send( result );
    } );

    // Change User Role API
    app.patch( '/users/:id/role', async ( req, res ) =>
    {
      const id = req.params.id;
      const { role } = req.body;
      const filter = { _id: new ObjectId( id ) };
      const updateDoc = {
        $set: {
          role: role
        }
      };
      const result = await userCollection.updateOne( filter, updateDoc );
      res.send( result );
    } );

    // Delete User

    app.delete( '/users/:id', verifyToken, verifyAdmin, async ( req, res ) =>
    {
      const id = req.params.id;

      // Check if the ID is a valid ObjectId
      if ( !ObjectId.isValid( id ) )
      {
        return res.status( 400 ).send( { message: 'Invalid ID format' } );
      }

      const query = { _id: new ObjectId( id ) };

      try
      {
        const result = await userCollection.deleteOne( query );

        if ( result.deletedCount === 0 )
        {
          return res.status( 404 ).send( { message: 'User not found' } );
        }

        res.send( { message: 'User deleted successfully', result } );
      } catch ( error )
      {
        console.error( 'Error deleting user:', error );
        res.status( 500 ).send( { message: 'An error occurred while deleting the user' } );
      }
    } );

    //  fetch admin profile information
    app.get( '/admin/profile', verifyAdmin, verifyToken, async ( req, res ) =>
    {
      try
      {

        const currentUser = req.user;
        const adminInfo = {
          userName: currentUser.displayName,
          userImage: currentUser.userImage,
          role: currentUser.role
        };
        res.status( 200 ).json( adminInfo );
      } catch ( error )
      {
        console.error( 'Error fetching admin profile:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );


    // Properties API
    app.get( '/properties', async ( req, res ) =>
    {
      try
      {
        const properties = await propertyCollection.find().toArray();
        res.status( 200 ).json( properties );
      } catch ( error )
      {
        console.error( 'Error fetching properties:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );


    app.get( '/properties/:id', async ( req, res ) =>
    {
      try
      {
        const id = req.params.id;
        const query = { _id: new ObjectId( id ) };
        const property = await propertyCollection.findOne( query );
        if ( !property )
        {
          return res.status( 404 ).json( { message: 'Property not found' } );
        }
        res.status( 200 ).json( property );
      } catch ( error )
      {
        console.error( 'Error fetching property:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );

    app.patch( '/properties/:id', async ( req, res ) =>
    {
      const { id } = req.params;
      const { title, location, image, agentName, agentEmail, priceRange } = req.body;

      const updatedProperty = {
        ...( title && { title } ),
        ...( location && { location } ),
        ...( image && { image } ),
        ...( agentName && { agentName } ),
        ...( agentEmail && { agentEmail } ),
        ...( priceRange && { priceRange } )
      };

      try
      {
        const result = await propertyCollection.findOneAndUpdate(
          { _id: new ObjectId( id ) },
          { $set: updatedProperty },
          { returnOriginal: false }
        );

        if ( !result.value )
        {
          return res.status( 404 ).json( { message: 'Property not found' } );
        }

        res.status( 200 ).json( result.value );
      } catch ( error )
      {
        console.error( 'Error updating property:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );

    // POST add a new property
    app.post( '/properties', verifyToken, verifyAgent, async ( req, res ) =>
    {
      const { title, location, image, bedNumber, bathNumber, agentName, agentEmail, price } = req.body;

      const newProperty = {
        title,
        location,
        image,
        bedNumber,
        bathNumber,
        agentName,
        agentEmail,
        price,
      };

      try
      {
        const result = await propertyCollection.insertOne( newProperty );
        res.status( 201 ).json( result );
        console.log( result );
      } catch ( error )
      {
        console.error( 'Error adding property:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );


    // PATCH endpoint to update an existing property by ID
    app.patch( '/properties/:id', async ( req, res ) =>
    {
      const { id } = req.params;
      const { title, location, image, bedNumber, bathNumber, agentName, agentEmail, price } = req.body;

      const updatedProperty = {
        ...( title && { title } ),
        ...( location && { location } ),
        ...( image && { image } ),
        ...( bedNumber !== undefined && { bedNumber } ),
        ...( bathNumber !== undefined && { bathNumber } ),
        ...( agentName && { agentName } ),
        ...( agentEmail && { agentEmail } ),
        ...( price !== undefined && { price } ),
      };


      try
      {
        const result = await propertyCollection.findOneAndUpdate(
          { _id: new ObjectId( id ) },
          { $set: updatedProperty },
          { returnOriginal: false }
        );

        if ( !result.value )
        {
          return res.status( 404 ).json( { message: 'Property not found' } );
        }

        res.status( 200 ).json( result.value );
      } catch ( error )
      {
        console.error( 'Error updating property:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );


    app.delete('/properties/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await propertyCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
          res.status(200).json({ message: 'Property deleted successfully' });
        } else {
          res.status(404).json({ message: 'Property not found' });
        }
      } catch (error) {
        console.error('Error deleting property:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });
    



// Backend API to fetch properties added by the agent
app.get('/properties/agent/:agentEmail', async (req, res) => {
  try {
    const { agentEmail } = req.params;
    const properties = await propertyCollection.find({ agentEmail }).toArray();
    res.status(200).json(properties);
    console.log('property with agent email', properties)
  } catch (error) {
    console.error('Error fetching properties by agent:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});








    // Backend API to update a property
    app.patch( '/properties/:id', async ( req, res ) =>
    {
      try
      {
        const { id } = req.params;
        const updatedData = req.body;

        const filter = { _id: new ObjectId( id ) };
        const updateDoc = {
          $set: {
            ...updatedData,
          },
        };

        const result = await propertyCollection.updateOne( filter, updateDoc );

        if ( result.modifiedCount === 0 )
        {
          return res.status( 404 ).json( { message: 'Property not found' } );
        }

        res.status( 200 ).json( { message: 'Property updated successfully' } );
      } catch ( error )
      {
        console.error( 'Error updating property:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );


    // Backend API to delete a property
    app.delete( '/properties/:id', async ( req, res ) =>
    {
      try
      {
        const { id } = req.params;

        const result = await propertyCollection.deleteOne( { _id: new ObjectId( id ) } );

        if ( result.deletedCount === 0 )
        {
          return res.status( 404 ).json( { message: 'Property not found' } );
        }

        res.status( 200 ).json( { message: 'Property deleted successfully' } );
      } catch ( error )
      {
        console.error( 'Error deleting property:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );

    // Verify property
    app.patch( '/properties/:id/verify', verifyToken, verifyAdmin, async ( req, res ) =>
    {
      try
      {
        const result = await propertiesCollection.updateOne(
          { _id: new ObjectId( req.params.id ) },
          { $set: { status: 'verified' } }
        );
        if ( result.modifiedCount > 0 )
        {
          res.json( { message: 'Property verified successfully' } );
        } else
        {
          res.status( 404 ).json( { message: 'Property not found' } );
        }
      } catch ( error )
      {
        res.status( 500 ).json( { message: 'Error verifying property', error } );
      }
    } );

    // Reject property
    app.patch( '/properties/:id/reject', verifyToken, verifyAdmin, async ( req, res ) =>
    {
      try
      {
        const result = await propertiesCollection.updateOne(
          { _id: new ObjectId( req.params.id ) },
          { $set: { status: 'rejected' } }
        );
        if ( result.modifiedCount > 0 )
        {
          res.json( { message: 'Property rejected successfully' } );
        } else
        {
          res.status( 404 ).json( { message: 'Property not found' } );
        }
      } catch ( error )
      {
        res.status( 500 ).json( { message: 'Error rejecting property', error } );
      }
    } );

  
    // Delete property
    app.delete( '/properties/:id', verifyToken, verifyAdmin, async ( req, res ) =>
    {
      try
      {
        const result = await propertyCollection.deleteOne( { _id: new ObjectId( req.params.id ) } );
        if ( result.deletedCount > 0 )
        {
          res.json( { message: 'Property deleted successfully' } );
        } else
        {
          res.status( 404 ).json( { message: 'Property not found' } );
        }
      } catch ( error )
      {
        res.status( 500 ).json( { message: 'Error deleting property', error } );
      }
    } );




    // Update property
    app.patch( '/properties/:id', verifyToken, verifyAgent, async ( req, res ) =>
    {
      try
      {
        const result = await propertyCollection.updateOne(
          { _id: new ObjectId( req.params.id ) },
          { $set: req.body }
        );
        if ( result.modifiedCount > 0 )
        {
          res.json( { message: 'Property updated successfully' } );
        } else
        {
          res.status( 404 ).json( { message: 'Property not found' } );
        }
      } catch ( error )
      {
        res.status( 500 ).json( { message: 'Error updating property', error } );
      }
    } );

    // Endpoint to fetch properties by agent email
    app.get( '/properties/agent/:agentEmail', verifyToken, verifyAgent, async ( req, res ) =>
    {
      const { agentEmail } = req.params;

      try
      {
        // Assuming propertyCollection is your MongoDB collection
        const properties = await propertyCollection.find( { agentEmail } ).toArray();

        res.json( properties );
      } catch ( error )
      {
        console.error( 'Error fetching properties by agent email:', error );
        res.status( 500 ).json( { message: 'Error fetching properties', error } );
      }
    } );





    // Wishlist API - GET
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


    // Wishlist API - POST
    app.post( '/wishlist', async ( req, res ) =>
    {
      const item = req.body;
      const result = await wishlistCollection.insertOne( item );
      console.log( result );
      res.send( result );
    } );




    // Wishlist API - DELETE
    // Wishlist API - DELETE
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
        console.error( "Failed to delete wishlist item", error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );



    // Reviews API
    app.post( '/reviews', async ( req, res ) =>
    {
      try
      {
        const review = req.body;
        const result = await reviewCollection.insertOne( review );
        res.status( 201 ).json( result );
      } catch ( error )
      {
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );

    app.get( '/reviews', async  ( req, res ) =>
    {
      try
      {
        const reviewsItems = await reviewCollection.find().toArray();
        res.status( 200 ).json( reviewsItems );
        console.log(reviewsItems);
      } catch ( error )
      {
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );

    app.delete( '/reviews/:id', async ( req, res ) =>
    {
      try
      {
        const reviewId = req.params.id;
        const result = await reviewCollection.deleteOne( { _id: new ObjectId( reviewId ) } );
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


    // offer related api:


    // Offers API - GET
    app.get( '/offers', async ( req, res ) =>
    {
      try
      {
        const offers = await offerCollection.find().toArray();
        res.status( 200 ).json( offers );
        // console.log(offers);
      } catch ( error )
      {
        console.error( "Failed to fetch offers", error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );


    // Offers API - POST
    app.post( '/offers', async ( req, res ) =>
    {
      const offer = req.body;
      try
      {
        const result = await offerCollection.insertOne( offer );
        res.status( 200 ).json( result ); // Return the inserted document
        console.log( result );
      } catch ( error )
      {
        console.error( "Failed to add offer", error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );


    // Update Offer Status API - PATCH
    app.patch( '/offers/:offerId/status', async ( req, res ) =>
    {
      const { offerId } = req.params;
      const { status, transactionId } = req.body;

      try
      {
        const updateData = { status };
        if ( transactionId )
        {
          updateData.transactionId = transactionId;
        }

        const result = await offersCollection.updateOne(
          { _id: new ObjectId( offerId ) },
          { $set: updateData }
        );

        if ( result.modifiedCount === 1 )
        {
          res.status( 200 ).json( { message: 'Offer status updated successfully' } );
        } else
        {
          res.status( 404 ).json( { message: 'Offer not found' } );
        }
      } catch ( error )
      {
        console.error( 'Failed to update offer status', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );


    // Offers API - DELETE
    app.delete( '/offers/:offerId', async ( req, res ) =>
    {
      const { offerId } = req.params;
      try
      {
        const result = await offersCollection.deleteOne( { _id: new ObjectId( offerId ) } );
        if ( result.deletedCount === 1 )
        {
          res.status( 200 ).json( { message: 'Offer deleted successfully' } );
        } else
        {
          res.status( 404 ).json( { message: 'Offer not found' } );
        }
      } catch ( error )
      {
        console.error( "Failed to delete offer", error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );


    // Fetch Requested/Offered Properties
    app.get( '/requested-offered-properties/:agentEmail', async ( req, res ) =>
    {
      try
      {
        const { agentEmail } = req.params;
        const properties = await requestedOfferedCollection.find( { agentEmail } ).toArray();
        res.status( 200 ).json( properties );
      } catch ( error )
      {
        console.error( 'Error fetching requested/offered properties:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );

    // Accept Offer
    app.patch( '/requested-offered-properties/:propertyId/accept', async ( req, res ) =>
    {
      try
      {
        const { propertyId } = req.params;
        const filter = { _id: new ObjectId( propertyId ) };
        const updateDoc = { $set: { status: 'accepted' } };
        const result = await requestedOfferedCollection.updateOne( filter, updateDoc );
        res.status( 200 ).json( result );
      } catch ( error )
      {
        console.error( 'Error accepting offer:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );

    // Reject Offer
    app.patch( '/requested-offered-properties/:propertyId/reject', async ( req, res ) =>
    {
      try
      {
        const { propertyId } = req.params;
        const filter = { _id: new ObjectId( propertyId ) };
        const updateDoc = { $set: { status: 'rejected' } };
        const result = await requestedOfferedCollection.updateOne( filter, updateDoc );
        res.status( 200 ).json( result );
      } catch ( error )
      {
        console.error( 'Error rejecting offer:', error );
        res.status( 500 ).json( { message: 'Internal Server Error' } );
      }
    } );

    // blogs related a

    app.get( '/blogs', async ( req, res ) =>
    {
      try
      {
        const blogs = await blogCollection.find( {} ).toArray();
        res.status( 200 ).json( blogs );
      } catch ( error )
      {
        console.error( 'Error fetching blogs:', error );
        res.status( 500 ).json( { message: 'An error occurred while fetching blogs.' } );
      }
    } );


    app.get( '/testimonials', async ( req, res ) =>
    {
      try
      {
        const testimonials = await testimonialCollection.find( {} ).toArray();
        res.status( 200 ).json( testimonials );
      } catch ( error )
      {
        console.error( 'Error fetching testimonials:', error );
        res.status( 500 ).json( { message: 'An error occurred while fetching testimonials.' } );
      }
    } );

    // Get a single testimonial by ID
    app.get( '/testimonials/:id', async ( req, res ) =>
    {
      const id = req.params.id;
      try
      {
        const testimonial = await testimonialCollection.findOne( { _id: new ObjectId( id ) } );
        if ( !testimonial )
        {
          return res.status( 404 ).json( { message: 'Testimonial not found' } );
        }
        res.status( 200 ).json( testimonial );
      } catch ( error )
      {
        console.error( 'Error fetching testimonial:', error );
        res.status( 500 ).json( { message: 'An error occurred while fetching the testimonial.' } );
      }
    } );

    // Create a new testimonial
    app.post( '/testimonials', async ( req, res ) =>
    {
      const newTestimonial = req.body;
      try
      {
        const result = await testimonialCollection.insertOne( newTestimonial );
        res.status( 201 ).json( result.ops[ 0 ] );
      } catch ( error )
      {
        console.error( 'Error creating testimonial:', error );
        res.status( 500 ).json( { message: 'An error occurred while creating the testimonial.' } );
      }
    } );




    console.log( "Pinged your deployment. You successfully connected to MongoDB!" );
  } catch ( error )
  {
    console.error( 'Error connecting to MongoDB:', error );
  }


}


run().catch( console.dir );

app.get( '/', ( req, res ) =>
{
  res.send( 'Realtor is running ' );
} );

app.listen( port, () =>
{
  console.log( `Realtor is running on port ${ port }` );
} );
