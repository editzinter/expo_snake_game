import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if admin key is provided in query param (basic security)
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (key !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Create stored procedure to initialize play time
    // Note: This requires that your service role has permissions to create functions
    const { error: rpcError } = await supabase.rpc('admin_create_play_time_function', {});
    
    if (rpcError) {
      // Try to create the function directly using SQL
      const { error: sqlError } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION initialize_play_time()
          RETURNS void AS $$
          BEGIN
            UPDATE player_stats 
            SET total_play_time = 0 
            WHERE total_play_time IS NULL;
          END;
          $$ LANGUAGE plpgsql;
        `
      });
      
      if (sqlError) {
        console.error("SQL execution error:", sqlError);
        return NextResponse.json({ 
          error: "Failed to create function", 
          details: sqlError.message 
        }, { status: 500 });
      }
    }
    
    // Verify that player_stats has total_play_time column
    const { data: columns, error: columnError } = await supabase
      .from('player_stats')
      .select('total_play_time')
      .limit(1);
      
    if (columnError) {
      console.error("Column check error:", columnError);
      
      // Try to add the column if it doesn't exist
      if (columnError.message.includes('column "total_play_time" does not exist')) {
        const { error: alterError } = await supabase.rpc('execute_sql', {
          sql: `
            ALTER TABLE player_stats 
            ADD COLUMN IF NOT EXISTS total_play_time integer DEFAULT 0;
          `
        });
        
        if (alterError) {
          return NextResponse.json({ 
            error: "Failed to add column", 
            details: alterError.message 
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({ 
          error: "Column check failed", 
          details: columnError.message 
        }, { status: 500 });
      }
    }
    
    // Run the initialize function to set NULL values to 0
    const { error: initError } = await supabase.rpc('initialize_play_time');
    
    if (initError) {
      console.error("Initialization error:", initError);
      return NextResponse.json({ 
        error: "Failed to initialize play time values", 
        details: initError.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Database setup completed successfully"
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ 
      error: "Unexpected error occurred", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 