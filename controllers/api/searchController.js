const matchAny = (value) =>{

    return `%${value}%`;
}
module.exports=
{
    search:(req,res)=>
    {
        const key = req.body?.key;

        var mst_file_sql ="SELECT `mf`.`id`,`mf`.`office_file_no`,`mf`.`file_name`,`ms`.`title` as `status`,concat(`cu`.`first_name`,' ',`cu`.`last_name`) as `client`,concat(`eu`.`first_name`,' ',`eu`.`last_name`) as `team` FROM `mst_file` as `mf` JOIN `mst_stage` as `ms` ON `mf`.`mst_stage_id`=`ms`.`id` LEFT JOIN `users` as `cu` ON `cu`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `eu` ON `eu`.`id`=`mf`.`team_id` WHERE `mf`.`office_file_no` LIKE '"+matchAny(key)+"' OR `mf`.`file_name` LIKE '"+matchAny(key)+"' OR `ms`.`title` LIKE '"+matchAny(key)+"' OR `cu`.`first_name` LIKE '"+matchAny(key)+"' OR `cu`.`last_name` LIKE '' OR `eu`.`first_name` LIKE '"+matchAny(key)+"' OR `eu`.`last_name` LIKE '"+matchAny(key)+"'";
        var employee_sql = "SELECT `u`.`id`,`u`.`first_name`,`u`.`last_name`,`u`.`email`,`u`.`phone` FROM `users` as u LEFT JOIN `users_groups` as `mu` ON `mu`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`mu`.`mst_group_id` WHERE `u`.`isdeleted`=0 AND `mg`.`name`='Employees' AND (`u`.`first_name` LIKE '"+matchAny(key)+"' OR `u`.`last_name`  LIKE '"+matchAny(key)+"' OR `u`.`email`  LIKE '"+matchAny(key)+"'  OR `u`.`phone`  LIKE '"+matchAny(key)+"')";
        var client_sql = "SELECT `u`.`id`,`u`.`first_name`,`u`.`last_name`,`u`.`email`,`u`.`phone` FROM `users` as u LEFT JOIN `users_groups` as `mu` ON `mu`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`mu`.`mst_group_id` WHERE `u`.`isdeleted`=0 AND `mg`.`name`='Client' AND (`u`.`first_name` LIKE '"+matchAny(key)+"' OR `u`.`last_name`  LIKE '"+matchAny(key)+"' OR `u`.`email`  LIKE '"+matchAny(key)+"'  OR `u`.`phone`  LIKE '"+matchAny(key)+"')";
        var expense_sql = "SELECT `de`.`id`,`de`.`expense_type`,`mf`.`file_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team` FROM `deposit_expense` as `de` LEFT JOIN `mst_file` as `mf` on `mf`.`id`=`de`.`mst_file_id` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` WHERE `de`.`isdeleted`=0 AND (`mf`.`file_name` LIKE '"+matchAny(key)+"' OR concat(`u`.`first_name`,' ',`u`.`last_name`) LIKE '"+matchAny(key)+"')";
        var todo_sql = "SELECT `t`.`id`,`t`.`title`,`mf`.`file_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team` FROM `todos` as `t` LEFT JOIN `mst_file` as `mf` ON `mf`.`id`=`t`.`mst_file_id` LEFT JOIN `users` as `u` ON  `u`.`id`=`t`.`team_id` WHERE `t`.`is_deleted`=0 AND (`t`.`title` LIKE '"+matchAny(key)+"' OR `mf`.`file_name` LIKE '"+matchAny(key)+"' OR  concat(`u`.`first_name`,' ',`u`.`last_name`) LIKE '"+matchAny(key)+"')";


        db.query(`${mst_file_sql};${employee_sql};${client_sql};${expense_sql};${todo_sql}`,(err,result)=>{
            if(err)
            {
                console.log(err);
                res.status(200).json({message:err.sqlMessage,error:true,data:{}});
            }
            else{
                res.status(200).json({message:"Fetched",data:{file_data:result[0],employee_data:result[1],client_data:result[2],expense_data:result[3],todo_data:result[4]},error:false});
            }
        });

    }
}
