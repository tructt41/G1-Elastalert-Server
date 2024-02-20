  // // Rules 1h_rules
  // if (rulename === 'telegram-sovico_credentials_breach_detected') {
  //   filePath = '/opt/elastalert/result_elastalert/1h_rules/telegram-sovico_credentials_breach_detected.txt';
  // } 
  // // Rules 1m_rules
  // else if (rulename === 'linux-discovery_sudo_allowed_command_enumeration') {
  //   filePath = '/opt/elastalert/result_elastalert/1m_rules/linux-discovery_sudo_allowed_command_enumeration.txt';
  // } 
  // // Rules 5m_rules
  // else if (rulename === 'g1_missing_log_on_cloudtrail') {
  //   filePath = '/opt/elastalert/result_elastalert/5m_rules/g1_missing_log_on_cloudtrail.txt';
  // }
  import RouteLogger from '../../routes/route_logger';
  import fs from 'fs';
  const logger = new RouteLogger('/status/:id*');
  
  export default function statusHandler(request, response) {
    const rulename = String(request.params.id); //|| 'defaultId';
    ////////////////////////////////////////////////////////////////////////////////
    let status = 'ERROR';
    let result = 'error';
    let timestamp = '';
    let dirPath = '/opt/elastalert/result_elastalert/'
    let filePath = dirPath + rulename + '.json';
    const regex = /(.*) - INFO/;
    ////////////////////////////////////////////////////////////////////////////////
    if (filePath) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        result = fileContent.toString();
        const match = fileContent.match(regex);
        if (match) {
          let time = match[1]// Extract matched characters before "- INFO"
          time = time.replace(/,/g, '.');
          let date = new Date(time);
          timestamp = date.toISOString(); 
          if (result.includes(status) || result.includes('error'))
            status = 'ERROR';
          else
            status = 'READY';
        } else {
          console.error('No matching pattern found in file content');
          result = 'No matching pattern found';
        }
      } catch (error) {
        console.error(`No such Result Elastalert: ${error.message}`);
        result = 'No such Result Elastalert';
      }
    }
  
    // Format result for API response
    response.json({
      rulename: rulename,
      status,
      timestamp,
      result
      // filePath
    });
  }